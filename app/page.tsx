"use client";

import HomeLayout from "@/components/HomeLayout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Subject = {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
};

type AttemptStats = {
  subject: string;
  correct: number;
  wrong: number;
  not_attended: number;
  total_questions: number;
  created_at: string;
  percentage: number;
};

export default function HomePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<AttemptStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
    loadUserData();
  }, []);

  function loadUserData() {
    // Get user ID from localStorage
    const firebaseUser = localStorage.getItem("firebase_user");
    if (firebaseUser) {
      try {
        const userData = JSON.parse(firebaseUser);
        const uid = userData.uid;
        setUserId(uid);
        loadUserStats(uid);
      } catch (error) {
        console.error("Failed to parse user data", error);
        setStatsLoading(false);
      }
    } else {
      setStatsLoading(false);
    }
  }

  async function loadUserStats(uid: string) {
    try {
      // Get latest attempt for each subject
      const { data, error } = await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load stats", error);
        setStatsLoading(false);
        return;
      }

      // Group by subject and get only the latest attempt
      const latestBySubject = new Map<string, any>();
      
      data?.forEach((attempt) => {
        if (!latestBySubject.has(attempt.subject)) {
          latestBySubject.set(attempt.subject, attempt);
        }
      });

      // Format stats
      const stats: AttemptStats[] = Array.from(latestBySubject.values()).map(
        (attempt) => ({
          subject: attempt.subject,
          correct: attempt.correct,
          wrong: attempt.wrong,
          not_attended: attempt.not_attended,
          total_questions: attempt.total_questions,
          created_at: attempt.created_at,
          percentage: Math.round(
            (attempt.correct / attempt.total_questions) * 100
          ),
        })
      );

      setUserStats(stats);
      setStatsLoading(false);
    } catch (error) {
      console.error("Error loading stats", error);
      setStatsLoading(false);
    }
  }

  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select(`
        id,
        name,
        slug,
        questions:questions(count)
      `)
      .order("name");

    if (error) {
      console.error("Failed to load subjects", error);
      return;
    }

    const formatted = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      questionCount: s.questions?.[0]?.count || 0,
    }));

    setSubjects(formatted);
    setLoading(false);
  }

  function getScoreColor(percentage: number) {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <HomeLayout>
      <div className="pt-10 pb-16 md:pt-12 lg:pt-10">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-slate-900 mb-10">
          Choose Your Skill Test
        </h1>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <section className="lg:col-span-2">
              {/* Subjects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading subjects...</p>
                ) : (
                  subjects.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/exam/${item.slug}`)}
                      className="
                        cursor-pointer rounded-lg border border-slate-200 
                        bg-white p-5 shadow-sm 
                        hover:shadow-lg hover:border-slate-400 
                        transition-all flex flex-col
                      "
                    >
                      <h2 className="text-lg font-semibold text-slate-900 mb-3">
                        {item.name}
                      </h2>

                      <div className="text-xs text-slate-600 space-y-1.5 flex-grow">
                        <p>• 30 sec / question</p>
                        <p>• MCQ Format</p>
                      </div>

                      <button
                        disabled={item.questionCount === 0}
                        className={`
                          mt-4 w-full rounded-md py-2 text-sm font-medium text-white cursor-pointer
                          ${
                            item.questionCount === 0
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-slate-800 hover:bg-slate-900"
                          }
                        `}
                      >
                        {item.questionCount === 0
                          ? "Coming Soon"
                          : "Start Test"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* RIGHT */}
            <aside className="lg:col-span-1 space-y-6">
              {/* User Stats Section */}
              {userId && userStats.length > 0 && (
                <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 sticky top-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span>📊</span> Your Latest Scores
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {userStats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 flex flex-col items-center justify-center text-center"
                      >
                        <h3 className="text-xs font-medium text-slate-600 capitalize mb-2">
                          {stat.subject}
                        </h3>
                        <span
                          className={`text-2xl font-bold ${getScoreColor(
                            stat.percentage
                          )}`}
                        >
                          {stat.percentage}% Score
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 sticky top-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Instructions
                </h2>

                <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                  <li>
                    <b>30+ MCQ questions</b> per test
                  </li>
                  <li>
                    <b>30 seconds</b> per question
                  </li>
                  <li>Total time auto-calculated</li>
                  <li>Do not refresh during exam</li>
                  <li>Tab switching is monitored</li>
                  <li>Instant result after submission</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}