"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  School,
  UserRound,
  Loader2,
  Clock,
  ShieldCheck,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schoolId, setSchoolId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");

  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [dailyLockTime, setDailyLockTime] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(authData.user.id);
      setEmail(authData.user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, full_name, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setError("We couldn't find your school profile.");
        setLoading(false);
        return;
      }

      setSchoolId(profile.school_id);
      setAdminName(profile.full_name || "");
      setRole(profile.role || "");

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("name, school_code")
        .eq("id", profile.school_id)
        .maybeSingle();

      if (schoolError || !school) {
        setError("We couldn't load your school details.");
        setLoading(false);
        return;
      }

      setSchoolName(school.name || "");
      setSchoolCode(school.school_code || "");

      if (profile.role === "school_admin") {
        const { data: attendanceSettings, error: settingsError } =
          await supabase
            .from("attendance_settings")
            .select(
              "auto_lock_enabled, daily_lock_time, timezone"
            )
            .eq("school_id", profile.school_id)
            .maybeSingle();

        if (settingsError) {
          setError(settingsError.message);
        } else if (attendanceSettings) {
          setAutoLockEnabled(
            attendanceSettings.auto_lock_enabled
          );
          setDailyLockTime(
            String(attendanceSettings.daily_lock_time).slice(0, 5)
          );
          setTimezone(
            attendanceSettings.timezone || "Asia/Kolkata"
          );
        }
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  async function saveAttendanceSettings() {
    if (!schoolId || !userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { error: saveError } = await supabase
      .from("attendance_settings")
      .upsert(
        {
          school_id: schoolId,
          auto_lock_enabled: autoLockEnabled,
          daily_lock_time: dailyLockTime,
          timezone,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "school_id",
        }
      );

    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage("Attendance settings saved successfully!");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={22} />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#193B32]">
              School Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your institution and attendance preferences.
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <School size={23} />
          </div>
          <div>
            <h2 className="font-bold text-[#193B32]">
              School information
            </h2>
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
            <p className="text-sm text-gray-500">
              Administrator name
            </p>
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

      {role === "school_admin" && (
        <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Clock size={23} />
              </div>
              <div>
                <h2 className="font-bold text-[#193B32]">
                  Attendance lock settings
                </h2>
                <p className="text-sm text-gray-500">
                  Configure when daily attendance should be locked.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#193B32]">
                  Automatic attendance locking
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Automatically lock eligible attendance sessions
                  after your configured daily time.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAutoLockEnabled(!autoLockEnabled)
                }
                aria-pressed={autoLockEnabled}
                className={`relative h-7 w-14 shrink-0 rounded-full transition ${
                  autoLockEnabled
                    ? "bg-emerald-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    autoLockEnabled
                      ? "left-8"
                      : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-gray-700">
                Daily lock time
                <input
                  type="time"
                  value={dailyLockTime}
                  onChange={(event) =>
                    setDailyLockTime(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <span className="block text-xs font-normal text-gray-500">
                  Attendance will be locked after this time.
                </span>
              </label>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                School timezone
                <select
                  value={timezone}
                  onChange={(event) =>
                    setTimezone(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="Asia/Kolkata">
                    India (Asia/Kolkata)
                  </option>
                  <option value="Asia/Dubai">
                    UAE (Asia/Dubai)
                  </option>
                  <option value="Asia/Singapore">
                    Singapore (Asia/Singapore)
                  </option>
                  <option value="Europe/London">
                    UK (Europe/London)
                  </option>
                  <option value="America/New_York">
                    USA - Eastern (America/New_York)
                  </option>
                  <option value="America/Los_Angeles">
                    USA - Pacific (America/Los_Angeles)
                  </option>
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 shrink-0 text-blue-700"
                  size={20}
                />
                <div>
                  <p className="font-semibold text-blue-900">
                    Attendance protection
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    Once a session is locked, teachers cannot
                    directly change its attendance records.
                    Corrections must go through administrator
                    approval.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Automatic locking is currently{" "}
                <strong>
                  {autoLockEnabled ? "enabled" : "disabled"}
                </strong>
                .
              </p>

              <button
                type="button"
                onClick={saveAttendanceSettings}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#066B4D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save attendance settings"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
