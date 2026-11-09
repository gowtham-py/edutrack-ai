"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarCheck,
  Play,
  Loader2,
  School,
  Save,
  Users,
  Lock,
  Unlock,
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

type Subject = {
  id: string;
  subject_name: string;
};

type Assignment = {
  id: string;
  class_id: string;
  subject_id: string;
};

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "approved_leave";

type Session = {
  id: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  class_id: string;
  subject_id: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
};

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
};

type CorrectionRequest = {
  id: string;
  session_id: string;
  student_id: string;
  requested_by: string;
  old_status: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

type AuditLog = {
  id: string;
  session_id: string;
  student_id: string;
  changed_by: string;
  old_status: string | null;
  new_status: string | null;
  action: string;
  changed_at: string;
};

const statusOptions: {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
