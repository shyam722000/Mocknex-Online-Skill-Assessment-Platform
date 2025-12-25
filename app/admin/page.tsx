"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Navbar } from "@/components/Navbar";
import { 
  BookOpen, 
  Upload, 
  FileJson, 
  Loader2, 
  Plus, 
  HelpCircle 
} from "lucide-react";
export default function AdminDashboard() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select(
        `
        id,
        name,
        slug,
        questions:questions(count)
      `
      )
      .order("name");

    if (error) {
      console.error("Failed to load subjects:", error);
      return;
    }

    const formatted = data.map((s: any) => ({
      ...s,
      questionCount: s.questions?.[0]?.count || 0,
    }));

    setSubjects(formatted);
  }

  async function addSubject() {
    if (!newSubject.trim()) return;

    await supabase.from("subjects").insert({
      name: newSubject.trim(),
      slug: newSubject
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    });

    setNewSubject("");
    loadSubjects();
  }

  async function handleJsonUpload() {
    if (!jsonFile || !subjectId) {
      alert("Please select a subject and JSON file");
      return;
    }

    if (isUploading) return;

    setIsUploading(true);

    try {
      // 1. Read file
      const text = await jsonFile.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.questions)) {
        alert("Invalid JSON format. Expected { questions: [...] }");
        return;
      }

      let successCount = 0;

      // 2. Process each question
      for (const q of data.questions) {
        if (
          !q.question ||
          !Array.isArray(q.options) ||
          q.options.length < 2 ||
          typeof q.correctIndex !== "number" ||
          q.correctIndex < 0 ||
          q.correctIndex >= q.options.length
        ) {
          console.warn("Skipping invalid question:", q);
          continue;
        }

        // Insert question
        const { data: questionRow, error: questionError } = await supabase
          .from("questions")
          .insert({
            subject_id: subjectId,
            question: q.question.trim(),
          })
          .select()
          .single();

        if (questionError || !questionRow) {
          console.error("Question insert failed:", questionError);
          continue;
        }

        // Insert options
        const optionRows = q.options.map((opt: string) => ({
          question_id: questionRow.id,
          option: opt.trim(),
        }));

        const { data: insertedOptions, error: optionsError } = await supabase
          .from("options")
          .insert(optionRows)
          .select();

        if (optionsError || !insertedOptions) {
          console.error("Options insert failed:", optionsError);
          continue;
        }

        // Set correct option
        const correctOption = insertedOptions[q.correctIndex];

        if (!correctOption) {
          console.error("Correct option index invalid:", q.correctIndex);
          continue;
        }

        const { error: updateError } = await supabase
          .from("questions")
          .update({
            correct_option_id: correctOption.id,
          })
          .eq("id", questionRow.id);

        if (updateError) {
          console.error("Failed to update correct_option_id:", updateError);
          continue;
        }

        successCount++;
      }

      alert(`✅ Successfully added ${successCount} questions`);

      await loadSubjects();
      // Reset form
      setJsonFile(null);
      setSubjectId("");
    } catch (err) {
      console.error("JSON upload failed:", err);
      alert("Failed to upload JSON. Check console for details.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left - Subjects */}
          <div className="lg:col-span-1 space-y-4">
            {/* Add Subject */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Add Subject
                </h2>
              </div>
              <div className="flex gap-2">
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Subject name..."
                  className="text-sm border border-gray-300 px-3 py-1.5 rounded flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addSubject}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition flex items-center gap-1 text-sm font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Subject List */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Subjects ({subjects.length})
              </h2>

              {subjects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No subjects yet
                </p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {subjects.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {s.questionCount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right - JSON Upload Only */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Upload Questions (JSON)
                </h2>
              </div>

              <div className="space-y-4">
                {/* Subject Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={isUploading}
                    className="text-sm w-full border border-gray-300 px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    JSON File
                  </label>

                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                      isUploading
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
                      disabled={isUploading}
                      className="hidden"
                      id="json-upload"
                    />
                    <label
                      htmlFor="json-upload"
                      className={`cursor-pointer flex flex-col items-center gap-2 ${
                        isUploading ? "cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileJson className="w-6 h-6 text-blue-600" />
                      </div>

                      {jsonFile ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {jsonFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(jsonFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            Click to upload or drag & drop
                          </p>
                          <p className="text-xs text-gray-500">
                            Supported: JSON file with questions
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Format hint */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Expected JSON format:
                  </p>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {`{
  "questions": [
    {
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1
    }
  ]
}`}
                  </pre>
                </div>

                {/* Upload Button */}
                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={handleJsonUpload}
                    disabled={isUploading || !jsonFile || !subjectId}
                    className={`
                      w-full flex items-center justify-center gap-2
                      px-4 py-2 rounded text-sm font-medium shadow-sm
                      transition cursor-pointer
                      ${
                        isUploading || !jsonFile || !subjectId
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }
                    `}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Questions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}