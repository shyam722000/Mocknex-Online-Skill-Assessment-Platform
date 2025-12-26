"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../lib/supabase";
import { Navbar } from "@/components/Navbar";

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt_id");

  const [attemptData, setAttemptData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResultData() {
      if (!attemptId) {
        setError("No attempt ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // ✅ TRY TO LOAD FROM SESSION STORAGE FIRST
        const sessionData = sessionStorage.getItem('examResults');
        
        if (sessionData) {
          const examData = JSON.parse(sessionData);
          
          // Fetch only attempt summary data from database
          const { data: attempt } = await supabase
            .from("attempts")
            .select("*")
            .eq("id", attemptId)
            .single();

          if (!attempt) {
            setError("Attempt not found");
            return;
          }

          setAttemptData(attempt);

          // Format questions from session storage
          const formatted = examData.questions.map((q: any) => {
            const userSelectedOptionId = q.userAnswer ? String(q.userAnswer) : null;
            const correctOptionId = String(q.correct_option_id);

            // Find correct option
            const correctOption = q.options.find(
              (o: any) => String(o.id) === correctOptionId
            );

            // Find user's selected option
            const userSelectedOption = userSelectedOptionId
              ? q.options.find((o: any) => String(o.id) === userSelectedOptionId)
              : null;

            // Determine status
            let status = "notAttended";
            if (userSelectedOptionId) {
              status = userSelectedOptionId === correctOptionId ? "correct" : "wrong";
            }

            return {
              id: q.question_id,
              number: q.number,
              question: q.question,
              comprehension: q.comprehension,
              image_url: q.image_url,
              options: q.options,
              correctOptionId,
              userSelectedOptionId,
              correctOption,
              userSelectedOption,
              status,
            };
          });

          setQuestions(formatted);
          
          // Clear session storage after loading
          sessionStorage.removeItem('examResults');
          
        } else {
          // ✅ FALLBACK TO DATABASE IF SESSION STORAGE IS EMPTY
          const { data: attempt } = await supabase
            .from("attempts")
            .select("*")
            .eq("id", attemptId)
            .single();

          if (!attempt) {
            setError("Attempt not found");
            return;
          }

          setAttemptData(attempt);

          const { data: subjectRow } = await supabase
            .from("subjects")
            .select("id")
            .eq("slug", attempt.subject)
            .single();

          if (!subjectRow) {
            setError("Subject not found");
            return;
          }

          const { data: questionsData } = await supabase
            .from("questions")
            .select(`
              id,
              question,
              comprehension,
              image_url,
              correct_option_id,
              options ( id, option )
            `)
            .eq("subject_id", subjectRow.id)
            .order("created_at");

          const { data: userAnswers } = await supabase
            .from("user_answers")
            .select("question_id, selected_option_id")
            .eq("attempt_id", attemptId);

          const answersMap: Record<string, string> = {};
          userAnswers?.forEach(a => {
            answersMap[String(a.question_id)] = String(a.selected_option_id);
          });

          const formatted = questionsData?.map((q, index) => {
            const userSelectedOptionId = answersMap[String(q.id)];
            const correctOptionId = String(q.correct_option_id);

            const correctOption = q.options.find(
              (o: any) => String(o.id) === correctOptionId
            );

            const userSelectedOption = userSelectedOptionId
              ? q.options.find((o: any) => String(o.id) === userSelectedOptionId)
              : null;

            let status = "notAttended";
            if (userSelectedOptionId) {
              status = userSelectedOptionId === correctOptionId ? "correct" : "wrong";
            }

            return {
              id: q.id,
              number: index + 1,
              question: q.question,
              comprehension: q.comprehension,
              image_url: q.image_url,
              options: q.options,
              correctOptionId,
              userSelectedOptionId: userSelectedOptionId || null,
              correctOption,
              userSelectedOption,
              status,
            };
          }) || [];

          setQuestions(formatted);
        }
      } catch (err) {
        console.error("Error loading results:", err);
        setError("Failed to load result");
      } finally {
        setLoading(false);
      }
    }

    loadResultData();
  }, [attemptId]);

  const getStatusColor = (status: string) => {
    if (status === "correct") return "bg-green-100 border-green-500";
    if (status === "wrong") return "bg-red-100 border-red-500";
    return "bg-gray-100 border-gray-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "correct") return "✓";
    if (status === "wrong") return "✗";
    return "—";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e9f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#e9f4ff] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <div className="text-red-500 text-4xl mb-3 text-center">⚠️</div>
          <p className="text-red-600 text-sm text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!attemptData) return null;

  const { correct, wrong, not_attended, total_questions, subject } = attemptData;

  return (
    <div className="min-h-screen bg-[#e9f4ff]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT SIDE – QUESTIONS REVIEW */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Review Your Answers
              </h2>

              <div className="space-y-4">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={`border rounded-md p-3 ${getStatusColor(q.status)}`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-[#12324a] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {q.number}
                      </div>

                      <div className="flex-1 text-sm">
                        {q.comprehension && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2 text-xs text-slate-700">
                            <span className="font-medium text-blue-900">
                              Comprehension:
                            </span>{" "}
                            {q.comprehension}
                          </div>
                        )}

                        <p className="text-slate-900 leading-snug font-semibold">
                          {q.question}
                        </p>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          q.status === "correct"
                            ? "bg-green-500 text-white"
                            : q.status === "wrong"
                            ? "bg-red-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {getStatusIcon(q.status)}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-1.5 ml-8">
                      {q.options.map((option: any, optIndex: number) => {
                        const optionIdStr = String(option.id);
                        const isCorrectOption = optionIdStr === q.correctOptionId;
                        const isUserSelected = optionIdStr === q.userSelectedOptionId;

                        let optionClass = "p-2.5 rounded border text-xs flex justify-between items-center transition-all ";

                        // Highlight correct answer in green
                        if (isCorrectOption) {
                          optionClass += "bg-green-50 border-green-500 border-2 font-semibold";
                        }
                        // Highlight user's wrong answer in red
                        else if (isUserSelected && q.status === "wrong") {
                          optionClass += "bg-red-50 border-red-500 border-2 font-semibold";
                        }
                        // Highlight user's correct answer
                        else if (isUserSelected && q.status === "correct") {
                          optionClass += "bg-green-50 border-green-500 border-2 font-semibold";
                        }
                        // Default styling for other options
                        else {
                          optionClass += "bg-white border-gray-200";
                        }

                        return (
                          <div key={option.id} className={optionClass}>
                            <span className={`${(isCorrectOption || isUserSelected) ? 'text-slate-900' : 'text-slate-600'}`}>
                              <span className="font-bold">{String.fromCharCode(65 + optIndex)}.</span> {option.option}
                            </span>

                            <div className="flex items-center gap-2">
                              {isCorrectOption && (
                                <span className="text-green-700 font-bold text-[10px] flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full">
                                  <span className="text-xs">✓</span>
                                  Correct
                                </span>
                              )}
                              {isUserSelected && q.status === "wrong" && (
                                <span className="text-red-700 font-bold text-[10px] flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded-full">
                                  <span className="text-xs">✗</span>
                                  Your Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional info for wrong answers */}
                    {q.status === "wrong" && q.userSelectedOption && q.correctOption && (
                      <div className="mt-3 ml-8 p-2.5 bg-amber-50 border-l-4 border-amber-400 rounded text-xs">
                        <p className="text-amber-900">
                          <span className="font-bold">📝 Review:</span> You selected{" "}
                          <span className="font-bold text-red-600">"{q.userSelectedOption.option}"</span>, 
                          but the correct answer is{" "}
                          <span className="font-bold text-green-600">"{q.correctOption.option}"</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – STATS */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-8 space-y-4">
              {/* Performance Indicator */}
              <div className="bg-white rounded-xl p-4 shadow text-center">
                <p className="text-xs text-slate-600 mb-2">Overall Performance</p>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className={`text-xs font-semibold inline-block py-1 px-2 rounded-full ${
                        (correct / total_questions) >= 0.8 ? 'text-green-600 bg-green-200' :
                        (correct / total_questions) >= 0.6 ? 'text-yellow-600 bg-yellow-200' :
                        'text-red-600 bg-red-200'
                      }`}>
                        {(correct / total_questions) >= 0.8 ? 'Excellent' :
                         (correct / total_questions) >= 0.6 ? 'Good' :
                         (correct / total_questions) >= 0.4 ? 'Average' : 'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${(correct / total_questions) * 100}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        (correct / total_questions) >= 0.8 ? 'bg-green-500' :
                        (correct / total_questions) >= 0.6 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-gradient-to-b from-[#177A9C] to-[#1C3141] text-white rounded-xl p-6 text-center shadow-lg">
                <p className="text-sm opacity-90 mb-1">Marks Obtained</p>
                <p className="text-5xl font-bold mb-2">
                  {correct} <span className="text-2xl opacity-80">/ {total_questions}</span>
                </p>
                <div className="h-px bg-white/30 my-3"></div>
                <p className="text-sm font-medium">
                  {subject.replace(/-/g, " ").toUpperCase()}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {((correct / total_questions) * 100).toFixed(1)}% Score
                </p>
              </div>

              {/* Detailed Stats */}
              <div className="bg-white rounded-xl p-5 shadow space-y-3 text-sm">
                <h3 className="font-semibold text-slate-900 text-base mb-3 pb-2 border-b">
                  Performance Breakdown
                </h3>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Questions</span>
                  <span className="font-bold text-slate-900">{total_questions}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Correct
                  </span>
                  <span className="font-bold text-green-600">{correct}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-red-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    Wrong
                  </span>
                  <span className="font-bold text-red-600">{wrong}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    Not Attended
                  </span>
                  <span className="font-bold text-gray-600">{not_attended}</span>
                </div>

                <div className="pt-3 mt-3 border-t">
                  <button
                    onClick={() => router.replace("/")}
                    className="w-full cursor-pointer bg-gradient-to-r from-[#12324a] to-[#1a4460] hover:from-[#0d2436] hover:to-[#12324a] text-white py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e9f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}