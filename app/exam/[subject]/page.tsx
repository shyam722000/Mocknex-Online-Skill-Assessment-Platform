"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "../../lib/context/AuthContext";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  STATUS,
  setLoading,
  setFetchError,
  initializeExam,
  tick,
  setShowSubmitModal,
  setIsSubmitting,
  setSubmitError,
  optionSelected,
  goToQuestion as goToQuestionAction,
  markForReview,
} from "../../store/examSlice";

// Configurable time per question (in seconds)
const SECONDS_PER_QUESTION = 30;

export default function ExamPage() {
  const router = useRouter();
  const { subject } = useParams();
  const dispatch = useAppDispatch();

  const {
    loading,
    fetchError,
    questions,
    currentIndex,
    answers,
    statusMap,
    remainingSeconds,
    showComprehension,
    showSubmitModal,
    isSubmitting,
    submitError,
    meta,
  } = useAppSelector((state) => state.exam);
  const { user } = useAuth();

  const subjectKey = String(subject || "").toLowerCase();
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // New state for additional features
  const [questionTimer, setQuestionTimer] = useState(SECONDS_PER_QUESTION);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [timeWarningShown, setTimeWarningShown] = useState({ fifty: false, eighty: false });
  const [showTimeWarning, setShowTimeWarning] = useState<string | null>(null);

  /* 🔒 Prevent refresh / back button leaving */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Tab switching detection
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const lastVisibilityRef = useRef<boolean>(true);

  const MIN_WARNING_INTERVAL_MS = 3000;
  const lastWarningTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";

      if (!isVisible && lastVisibilityRef.current === true) {
        const now = Date.now();

        if (now - lastWarningTimeRef.current < MIN_WARNING_INTERVAL_MS) {
          return;
        }

        lastWarningTimeRef.current = now;

        setTabWarningCount((prev) => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setShowTabWarning(true);
          } else if (newCount >= 2) {
            setTimeout(() => {
              window.location.href = "/login?cheating_attempt=true";
            }, 800);

            setShowTabWarning(true);
          }

          return newCount;
        });
      }

      lastVisibilityRef.current = isVisible;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // DevTools detection
  useEffect(() => {
    const threshold = 200;
    let devtoolsOpen = false;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          setTabWarningCount((c) => c + 1);
          devtoolsOpen = true;
        }
      } else {
        devtoolsOpen = false;
      }
    };

    const interval = setInterval(checkDevTools, 800);

    return () => clearInterval(interval);
  }, []);

  /* ---------- LOAD QUESTIONS FROM SUPABASE ---------- */
  useEffect(() => {
    async function loadQuestions() {
      try {
        dispatch(setLoading(true));
        dispatch(setFetchError(""));

        const { data: subjectRow, error: subjectError } = await supabase
          .from("subjects")
          .select("id, name")
          .eq("slug", subjectKey)
          .single();

        if (subjectError || !subjectRow) {
          dispatch(setFetchError("Invalid test selected"));
          return;
        }

        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select(`
            id,
            question,
            comprehension,
            image_url,
            correct_option_id,
            options (
              id,
              option
            )
          `)
          .eq("subject_id", subjectRow.id)
          .order("created_at");

        if (qError || !questionsData || questionsData.length === 0) {
          dispatch(setFetchError("No questions available for this subject"));
          return;
        }

        const formatted = questionsData.map((q, index) => ({
          question_id: q.id,
          number: index + 1,
          question: q.question,
          comprehension: q.comprehension,
          image_url: q.image_url,
          correct_option_id: q.correct_option_id,
          options: q.options,
        }));

        const questionCount = formatted.length;

        dispatch(
          initializeExam({
            questions: formatted,
            questionsCount: questionCount,
            totalMarks: questionCount,
            totalTime: questionCount * SECONDS_PER_QUESTION,
            markPerAnswer: 1,
          })
        );
      } catch (err) {
        console.error(err);
        dispatch(setFetchError("Failed to load questions"));
      } finally {
        dispatch(setLoading(false));
      }
    }

    if (subjectKey) loadQuestions();
  }, [dispatch, subjectKey]);

  /* ---------- TIMER ---------- */
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const id = setInterval(() => dispatch(tick()), 1000);
    return () => clearInterval(id);
  }, [remainingSeconds, dispatch]);

  /* ---------- CHECK IF TIME IS UP ---------- */
  useEffect(() => {
    if (remainingSeconds !== null && remainingSeconds <= 0 && questions.length > 0) {
      setShowTimeUpModal(true);
    }
  }, [remainingSeconds, questions.length]);

  /* ---------- TIME WARNINGS (50% and 80%) ---------- */
  useEffect(() => {
    if (remainingSeconds === null || meta?.totalTime === null) return;

    const totalTime = meta.totalTime;
    const fiftyPercent = totalTime * 0.5;
    const twentyPercent = totalTime * 0.2;

    if (remainingSeconds <= fiftyPercent && !timeWarningShown.fifty) {
      setShowTimeWarning("50% of time remaining!");
      setTimeWarningShown(prev => ({ ...prev, fifty: true }));
      setTimeout(() => setShowTimeWarning(null), 3000);
    }

    if (remainingSeconds <= twentyPercent && !timeWarningShown.eighty) {
      setShowTimeWarning("Only 20% of time remaining!");
      setTimeWarningShown(prev => ({ ...prev, eighty: true }));
      setTimeout(() => setShowTimeWarning(null), 3000);
    }
  }, [remainingSeconds, meta?.totalTime, timeWarningShown]);

  /* ---------- QUESTION TIMER ---------- */
  useEffect(() => {
    setQuestionTimer(SECONDS_PER_QUESTION);

    const id = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          clearInterval(id);

          if (currentIndex < questions.length - 1) {
            dispatch(goToQuestionAction(currentIndex + 1));
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [currentIndex, dispatch, questions.length]);

  /* ---------- ACTIONS ---------- */
  const handleOptionChange = (optionId: string | number) => {
    dispatch(optionSelected((optionId as any)));
  };

  const goToQuestion = (index: number) => {
    dispatch(goToQuestionAction(index));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const handleMarkForReview = () => {
    dispatch(markForReview());
    if (!isLastQuestion) handleNext();
  };

  const handleNextOrSubmit = () => {
    if (isLastQuestion) {
      dispatch(setShowSubmitModal(true));
    } else {
      handleNext();
    }
  };

  const subjectLabel =
    typeof subject === "string"
      ? subject.replace(/-/g, " ").toUpperCase()
      : "SUBJECT";

  /* ---------- SUBMIT ---------- */
  const handleSubmitExam = async () => {
    try {
      if (!user || !user.uid) {
        dispatch(setSubmitError("User not authenticated"));
        return;
      }

      dispatch(setIsSubmitting(true));
      dispatch(setSubmitError(""));

      let correct = 0;
      let wrong = 0;

      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_option_id) correct++;
        else if (answers[idx]) wrong++;
      });

      const notAttended = questions.length - correct - wrong;

      // ✅ Save attempt with Firebase UID
      const { data: attemptData, error: attemptError } = await supabase
        .from("attempts")
        .insert({
          user_id: user.uid,
          subject: subjectKey,
          correct: correct,
          wrong: wrong,
          not_attended: notAttended,
          total_questions: questions.length,
        })
        .select()
        .single();

      if (attemptError) {
        console.error("Attempt Error:", attemptError);
        throw new Error("Failed to save attempt: " + attemptError.message);
      }

      // ✅ Save individual answers (INCLUDING WRONG ONES)
      const answerRecords = questions
        .map((q, idx) => {
          if (answers[idx]) {
            return {
              attempt_id: attemptData.id,
              question_id: q.question_id,
              selected_option_id: answers[idx],
            };
          }
          return null;
        })
        .filter(Boolean);

      if (answerRecords.length > 0) {
        const { error: answersError } = await supabase
          .from("user_answers")
          .insert(answerRecords);

        if (answersError) {
          console.error("Failed to save answers:", answersError);
        }
      }

      dispatch(setShowSubmitModal(false));
      setShowTimeUpModal(false);

      router.push(`/result?attempt_id=${attemptData.id}`);
      
    } catch (err) {
      console.error("Submit Error:", err);
      dispatch(setSubmitError("Something went wrong during submission."));
    } finally {
      dispatch(setIsSubmitting(false));
    }
  };

  const openComprehension = () => {
    if (currentQuestion?.comprehension) {
      dispatch(setShowComprehension(true));
    }
  };

  const formatTime = (secs: number | null) => {
    if (secs === null || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case STATUS.ANSWERED:
        return "bg-emerald-500 text-white shadow-sm";
      case STATUS.NOT_ANSWERED:
        return "bg-rose-500 text-white shadow-sm";
      case STATUS.REVIEW:
        return "bg-violet-600 text-white shadow-sm";
      case STATUS.ANSWERED_REVIEW:
        return "bg-emerald-500 text-white border-2 border-violet-600 shadow-sm";
      default:
        return "bg-white text-slate-700 border border-slate-200 hover:border-slate-300";
    }
  };

  /* ---------- LOADING / ERROR ---------- */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <div className="text-red-500 text-4xl mb-3 text-center">⚠️</div>
          <p className="text-red-600 text-sm text-center">{fetchError}</p>
        </div>
      </div>
    );
  }

  /* ---------- MAIN UI ---------- */
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col overflow-hidden">
      <Navbar />
      
      {/* Time Warning Notification */}
      {showTimeWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-5 py-2.5 rounded-md shadow-md text-sm font-medium">
            ⏰ {showTimeWarning}
          </div>
        </div>
      )}

      <main className="flex-1 flex px-3 py-3 overflow-hidden">
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-xl flex overflow-hidden">
          {/* Question Area */}
          <section className="flex-[2.5] border-r border-slate-200 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50">
              <button
                onClick={openComprehension}
                className="px-3 py-1.5 text-xs bg-gradient-to-r from-slate-900 to-black text-white rounded-lg disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed hover:shadow-md transition-all font-medium"
              >
                📘 {subjectLabel}
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all ${
                  questionTimer <= 10 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' : 
                  questionTimer <= 20 ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 
                  'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                }`}>
                  ⏱️ {formatTime(questionTimer)}
                </span>
              </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-4 mb-4 border border-slate-200">
                <p className="text-sm leading-relaxed text-slate-800">
                  <span className="font-bold text-blue-700">Q{currentQuestion?.number}.</span>{" "}
                  <span className="font-semibold">
                    {currentQuestion?.question}
                  </span>
                </p>
              </div>

              <div className="space-y-2.5">
                {currentQuestion?.options?.map((opt: any, idx: number) => {
                  const isSelected = String(answers[currentIndex]) === String(opt.id);
                  
                  return (
                    <label
                      key={opt.id}
                      className={`group block rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-md transform scale-[1.01]' 
                          : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={`question-${currentIndex}`}
                          checked={isSelected}
                          onChange={() => handleOptionChange(opt.id)}
                          className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className={`text-sm flex-1 ${isSelected ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
                          <span className="font-bold">{String.fromCharCode(65 + idx)}.</span> {opt.option}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t border-slate-200 flex gap-2 bg-white">
              <button
                onClick={handleMarkForReview}
                className="flex-1 cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                🔖 Mark for Review
              </button>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 py-2.5 rounded-lg text-sm font-medium transition-all"
              >
                ← Previous
              </button>
              <button
                onClick={handleNextOrSubmit}
                className="flex-1 cursor-pointer bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                {isLastQuestion ? "Submit Test ✓" : "Next →"}
              </button>
            </div>
          </section>

          {/* Question Palette */}
          <aside className="flex-[1] p-3 bg-gradient-to-br from-slate-50 to-blue-50 overflow-y-auto flex flex-col">
            {/* Timer Display */}
            <div className="mb-3 bg-white rounded-lg p-2.5 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Time Remaining</span>
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-3 py-1 rounded-md shadow-sm">
                  <span className="text-sm font-bold tracking-wider">{formatTime(remainingSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <div className="flex-1 bg-white rounded-lg p-2.5 shadow-sm border border-slate-200 mb-3 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-700 mb-2">Questions</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    className={`h-8 cursor-pointer rounded-md flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 ${getStatusClass(
                      statusMap[idx]
                    )} ${
                      idx === currentIndex
                        ? "ring-2 ring-offset-1 ring-blue-500 scale-105"
                        : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Legend</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-emerald-500 flex-shrink-0"></div>
                  <span className="text-slate-600 text-[10px]">Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-rose-500 flex-shrink-0"></div>
                  <span className="text-slate-600 text-[10px]">Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-violet-600 flex-shrink-0"></div>
                  <span className="text-slate-600 text-[10px]">Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-white border-2 border-slate-300 flex-shrink-0"></div>
                  <span className="text-slate-600 text-[10px]">Not Visited</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Time Up Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
              <div className="text-5xl mb-2">⏰</div>
              <h2 className="text-2xl font-bold text-white">Time's Up!</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center mb-6 text-sm">
                The exam time has ended. Click below to view your results.
              </p>
              {submitError && (
                <p className="text-red-600 mb-4 text-center text-sm">{submitError}</p>
              )}
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="w-full cursor-pointer bg-gradient-to-r from-slate-700 to-slate-900 text-white py-3 rounded-xl hover:from-slate-800 hover:to-black disabled:opacity-60 transition-all shadow-lg hover:shadow-xl text-sm font-semibold"
              >
                {isSubmitting ? "Loading Results..." : "View Result →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <h2 className="text-xl font-bold text-white">Submit Test?</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6 text-sm">
                You will not be able to make changes after submission. Are you sure you want to continue?
              </p>
              {submitError && (
                <p className="text-red-600 mb-4 text-sm">{submitError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => dispatch(setShowSubmitModal(false))}
                  className="flex-1 py-2.5 border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer bg-gradient-to-r from-slate-700 to-slate-900 text-white py-2.5 rounded-lg hover:from-slate-800 hover:to-black disabled:opacity-60 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                >
                  {isSubmitting ? "Submitting..." : "Submit Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Warning Modal */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-400">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-2xl font-bold text-white">
                {tabWarningCount >= 2 ? "FINAL WARNING" : "WARNING"}
              </h2>
            </div>

            <div className="p-6 text-center">
              {tabWarningCount === 1 ? (
                <>
                  <p className="text-lg font-semibold text-red-700 mb-3">
                    Tab switching detected!
                  </p>
                  <p className="text-slate-700 mb-6">
                    Please stay on this tab during the entire examination.
                    <br />
                    <strong>This is your first and last warning.</strong>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-red-700 mb-4">
                    Multiple tab switches detected!
                  </p>
                  <p className="text-slate-700 mb-6">
                    This behavior is considered <strong>cheating attempt</strong>.
                    <br />
                    The system will now terminate your session.
                  </p>
                </>
              )}

              <button
                onClick={() => {
                  if (tabWarningCount >= 2) {
                    window.location.href = "/login?cheating_attempt=true";
                  } else {
                    setShowTabWarning(false);
                  }
                }}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-lg"
              >
                {tabWarningCount >= 2 ? "I understand →" : "I will stay on this tab"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}