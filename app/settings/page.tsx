"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Settings, School, UserRound, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setMessage("Please log in again.");
        setLoading(false);
        return;
      }

      setEmail(authData.user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, full_name")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile.");
        setLoading(false);
        return;
      }

      setAdminName(profile.full_name || "");

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("name, school_code")
        .eq("id", profile.school_id)
        .maybeSingle();

      if (schoolError || !school) {
        setMessage("We couldn't load your school details.");
        setLoading(false);
        return;
      }

      setSchoolName(school.name || "");
      setSchoolCode(school.school_code || "");
      setLoading(false);
    }

    loadSettings();
  }, []);

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-2xl font-bold text-[#193B32]">
          School Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View your school and administrator account details.
        </p>
      </section>

      {message && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          Loading settings...
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <School size={23} />
              </div>
              <div>
                <h2 className="font-bold text-[#193B32]">School information</h2>
                <p className="text-sm text-gray-500">
                  Your registered institution details.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">School name</p>
                <p className="mt-1 font-semibold text-[#193B32]">
                  {schoolName || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">School code</p>
                <p className="mt-1 font-semibold text-[#193B32]">
                  {schoolCode || "Not available"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                <UserRound size={23} />
              </div>
              <div>
                <h2 className="font-bold text-[#193B32]">
                  Administrator account
                </h2>
                <p className="text-sm text-gray-500">
                  Your account information.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Administrator name</p>
                <p className="mt-1 font-semibold text-[#193B32]">
                  {adminName || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email address</p>
                <p className="mt-1 break-all font-semibold text-[#193B32]">
                  {email || "Not available"}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
