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

export default function HomePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

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

  return (
    <HomeLayout>
      <div className="pt-10 pb-16 md:pt-12 lg:pt-10">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-slate-900 mb-10">
          Choose Your Skill Test
        </h1>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <section className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                      {/* <p>• {item.questionCount} Questions</p> */}
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
                      {item.questionCount === 0 ? "Coming Soon" : "Start Test"}
                    </button>
                  </div>
                ))
              )}
            </section>

            {/* RIGHT */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 sticky top-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-5">
                  Instructions
                </h2>

                <ul className="list-disc list-inside space-y-2.5 text-sm text-slate-700">
                  <li><b>30+ MCQ questions</b> per test</li>
                  <li><b>30 seconds</b> per question</li>
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
