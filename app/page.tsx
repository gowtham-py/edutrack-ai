"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, Camera, Check, ChevronDown, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, Download, FileBarChart, GraduationCap, LayoutDashboard,
  Menu, MoreHorizontal, Search, Settings, ShieldCheck, Users, UserRound,
  X, Sparkles, ScanFace, School, TrendingUp
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";

type Section = "Overview" | "Live Attendance" | "Students" | "Classes & Subjects" | "Reports" | "Settings";
type Student = { id: string; name: string; className: string; roll: string; status: "Present" | "Absent" | "Late" | "Leave"; initials: string; color: string };

const initialStudents: Student[] = [
  { id:"ST-1042", name:"Aarav Sharma", className:"Grade 10 · A", roll:"10A-01", status:"Present", initials:"AS", color:"blue" },
  { id:"ST-1043", name:"Ananya Patel", className:"Grade 10 · A", roll:"10A-02", status:"Present", initials:"AP", color:"pink" },
  { id:"ST-1044", name:"Vihaan Reddy", className:"Grade 10 · A", roll:"10A-03", status:"Late", initials:"VR", color:"orange" },
  { id:"ST-1045", name:"Diya Nair", className:"Grade 10 · A", roll:"10A-04", status:"Present", initials:"DN", color:"purple" },
  { id:"ST-1046", name:"Kabir Mehta", className:"Grade 10 · A", roll:"10A-05", status:"Absent", initials:"KM", color:"green" },
  { id:"ST-1047", name:"Ishita Rao", className:"Grade 10 · A", roll:"10A-06", status:"Present", initials:"IR", color:"pink" },
];

const trend = [
  { day:"Mon", rate:91, last:87 }, { day:"Tue", rate:94, last:89 }, { day:"Wed", rate:89, last:91 },
  { day:"Thu", rate:96, last:90 }, { day:"Fri", rate:93, last:88 }, { day:"Sat", rate:97, last:92 },
];
const week = [
  { name:"Grade 6", value:92 }, { name:"Grade 7", value:88 }, { name:"Grade 8", value:95 },
  { name:"Grade 9", value:86 }, { name:"Grade 10", value:94 }, { name:"Grade 11", value:90 },
];

const navItems: { label: Section; icon: typeof LayoutDashboard; group: string }[] = [
  { label:"Overview", icon:LayoutDashboard, group:"WORKSPACE" },
  { label:"Live Attendance", icon:ScanFace, group:"WORKSPACE" },
  { label:"Students", icon:Users, group:"MANAGEMENT" },
  { label:"Classes & Subjects", icon:BookOpen, group:"MANAGEMENT" },
  { label:"Reports", icon:FileBarChart, group:"INSIGHTS" },
  { label:"Settings", icon:Settings, group:"SYSTEM" },
];

function Status({ value }: { value: Student["status"] }) {
  const styles = { Present:"bg-emerald-50 text-emerald-700", Absent:"bg-rose-50 text-rose-700", Late:"bg-amber-50 text-amber-700", Leave:"bg-sky-50 text-sky-700" };
  return <span className={`pill ${styles[value]}`}>{value}</span>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("Overview");
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => students.filter(s => `${s.name} ${s.id} ${s.roll}`.toLowerCase().includes(search.toLowerCase())), [students, search]);

  function changeStatus(id: string, status: Student["status"]) {
    setStudents(current => current.map(s => s.id === id ? { ...s, status } : s));
  }
  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">E</div>
          <div><div className="font-extrabold text-[17px] tracking-tight">EduTrack <span className="text-[#7655d8]">AI</span></div><div className="text-[10px] text-slate-400 font-semibold tracking-wide">SMART CAMPUS</div></div>
          <button className="ml-auto md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="rounded-xl bg-[#f6f7ff] p-3 mb-5 mx-1">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white text-[#4169e1] grid place-items-center"><School size={16}/></div><div className="min-w-0"><div className="text-xs font-bold truncate">Greenwood Public School</div><div className="text-[10px] text-slate-400">Premium campus</div></div><ChevronDown size={14} className="ml-auto text-slate-400"/></div>
        </div>
        {["WORKSPACE","MANAGEMENT","INSIGHTS","SYSTEM"].map(group => <div key={group}>
          <div className="nav-label">{group}</div>
          {navItems.filter(n => n.group === group).map(item => {
            const Icon = item.icon;
            return <button key={item.label} className={`nav-item ${section === item.label ? "active" : ""}`} onClick={() => { setSection(item.label); setMenuOpen(false); }}>
              <Icon size={17}/><span>{item.label}</span>{item.label === "Live Attendance" && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500"/>}
            </button>;
          })}
        </div>)}
        <div className="mt-auto rounded-2xl p-4 bg-gradient-to-br from-[#edf2ff] to-[#f5efff]">
          <div className="w-8 h-8 rounded-xl bg-white text-[#7655d8] grid place-items-center mb-3"><Sparkles size={16}/></div>
          <div className="text-xs font-extrabold mb-1">AI attendance insights</div>
          <p className="text-[10px] leading-relaxed text-slate-500 mb-3">Spot attendance patterns and support students early.</p>
          <button onClick={() => setSection("Reports")} className="text-[10px] font-bold text-[#5b55c9] flex items-center gap-1">Explore insights <ChevronRight size={12}/></button>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-4 px-1">
          <div className="w-8 h-8 rounded-full bg-[#e8edff] text-[#4169e1] grid place-items-center text-[10px] font-extrabold">AM</div>
          <div><div className="text-xs font-bold">Admin Manager</div><div className="text-[10px] text-slate-400">School Admin</div></div><MoreHorizontal size={17} className="ml-auto text-slate-400"/>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="mobile-menu text-slate-500" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
            <div><div className="text-[11px] text-slate-400">Greenwood Public School <span className="mx-1">/</span> <span className="text-slate-600">{section}</span></div><div className="font-extrabold text-[16px]">{section === "Overview" ? "Good morning, Admin!" : section}</div></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2"><CalendarDays size={14}/> Monday, 31 October 2026</div>
            <button onClick={() => notify("You're all caught up!")} className="w-9 h-9 rounded-xl border border-slate-100 grid place-items-center text-slate-500 relative"><Bell size={17}/><span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full"/></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5579e8] to-[#9162d7] text-white grid place-items-center text-[11px] font-extrabold">AM</div>
          </div>
        </header>

        <div className="page">
          {section === "Overview" && <Overview setSection={setSection} notify={notify}/>}
          {section === "Live Attendance" && <div>
            <PageHeading eyebrow="ATTENDANCE CENTER" title="Live attendance" desc="Start a teacher-led attendance session and review recognition results." action={<button className="btn-primary" onClick={() => setShowModal(true)}><Camera size={15}/> Start new session</button>}/>
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_.8fr] gap-5 mt-6">
              <div className="card p-5">
                <div className="flex justify-between items-center mb-4"><div><div className="font-extrabold text-sm">Camera attendance</div><div className="text-xs muted mt-1">Grade 10 · Section A · Mathematics</div></div><span className="pill bg-emerald-50 text-emerald-700">● Ready</span></div>
                <div className="aspect-video rounded-2xl bg-slate-900 relative overflow-hidden grid place-items-center">
                  <div className="absolute inset-0 opacity-30" style={{backgroundImage:"linear-gradient(#ffffff18 1px,transparent 1px),linear-gradient(90deg,#ffffff18 1px,transparent 1px)",backgroundSize:"34px 34px"}}/>
                  <div className="text-center text-white relative"><div className="w-16 h-16 rounded-2xl bg-white/10 grid place-items-center mx-auto mb-3"><Camera size={28}/></div><div className="text-sm font-bold">{scanRunning ? "Demo scan running" : "Camera preview placeholder"}</div><div className="text-[10px] text-white/60 mt-1">{scanRunning ? "UI demonstration only — no camera or AI is connected" : "Connect a camera and local AI service in a later phase"}</div></div>
                  <div className="absolute top-4 left-4 flex gap-2"><span className="pill bg-black/40 text-white">CAM 01</span><span className="pill bg-black/40 text-white">DEMO VIEW</span></div>
                  <div className="absolute bottom-4 right-4 text-white/70 text-[10px] flex items-center gap-1"><Activity size={12}/> Preview inactive</div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4"><button className="btn-primary" onClick={() => setScanRunning(!scanRunning)}><ScanFace size={15}/>{scanRunning ? "Stop demo scan" : "Start demo scan"}</button><button className="btn-soft" onClick={() => notify("Camera integration will be added in the AI phase.")}>Camera settings</button><span className="text-[10px] muted ml-auto">Teacher approval required</span></div>
              </div>
              <div className="card p-5">
                <div className="font-extrabold text-sm">Session summary</div><div className="text-xs muted mt-1">Illustrative session data</div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <MiniMetric label="Recognized" value="24" tone="green"/><MiniMetric label="Unidentified" value="03" tone="orange"/><MiniMetric label="Pending review" value="05" tone="purple"/><MiniMetric label="Roster size" value="32" tone="blue"/>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 mt-4 flex gap-2"><AlertTriangle size={16} className="text-amber-600 shrink-0"/><p className="text-[10px] leading-relaxed text-amber-800">Unidentified faces are not automatically marked absent. Review each result before confirming attendance.</p></div>
                <button className="w-full btn-primary justify-center mt-4" onClick={() => notify("Demo review opened. Connect the attendance backend to save records.")}><ClipboardCheck size={15}/> Review & confirm</button>
              </div>
            </div>
            <div className="card mt-5"><div className="p-5 flex items-center justify-between"><div><div className="font-extrabold text-sm">Recognition review queue</div><div className="text-xs muted mt-1">Example records for UI preview</div></div><span className="pill bg-violet-50 text-violet-700">5 to review</span></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>CLASS</th><th>CONFIDENCE</th><th>REVIEW STATUS</th><th>ACTION</th></tr></thead><tbody>{students.slice(0,4).map((s,i)=><tr key={s.id}><td className="font-bold text-slate-700">{s.name}</td><td>{s.className}</td><td>{[98,94,76,91][i]}%</td><td><span className="pill bg-amber-50 text-amber-700">Needs review</span></td><td><button className="btn-soft" onClick={() => notify(`Review opened for ${s.name}`)}>Review</button></td></tr>)}</tbody></table></div></div>
          </div>}
          {section === "Students" && <div>
            <PageHeading eyebrow="CAMPUS DIRECTORY" title="Students" desc="Manage student profiles, enrollment and class assignments." action={<button className="btn-primary" onClick={() => notify("Student creation form will be connected in the backend phase.")}><Users size={15}/> Add student</button>}/>
            <div className="card mt-6"><div className="p-5 flex flex-wrap gap-3 items-center justify-between"><div className="font-extrabold text-sm">All students <span className="text-slate-400 font-medium">({students.length} demo records)</span></div><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..." className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none w-56"/></div></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS</th><th>ROLL NO.</th><th>STATUS</th><th>PROFILE</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-full bg-${s.color}-100 text-slate-600 grid place-items-center text-[10px] font-bold`}>{s.initials}</div><span className="font-bold text-slate-700">{s.name}</span></div></td><td>{s.id}</td><td>{s.className}</td><td>{s.roll}</td><td><Status value={s.status}/></td><td><button className="btn-soft" onClick={()=>notify(`Profile preview: ${s.name}`)}>View</button></td></tr>)}</tbody></table></div></div>
          </div>}
          {section === "Classes & Subjects" && <div><PageHeading eyebrow="ACADEMIC STRUCTURE" title="Classes & subjects" desc="Organize sections, subjects, teachers and timetables." action={<button className="btn-primary" onClick={()=>notify("Class creation will be connected in the backend phase.")}>＋ Add class</button>}/><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">{["Grade 8 · A","Grade 9 · A","Grade 10 · A","Grade 10 · B","Grade 11 · Science","Grade 12 · Commerce"].map((c,i)=><div className="card p-5" key={c}><div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center"><GraduationCap size={19}/></div><button className="text-slate-400"><MoreHorizontal size={18}/></button></div><div className="font-extrabold mt-4">{c}</div><div className="text-xs muted mt-1">{[32,29,31,28,26,24][i]} students · {[6,7,8,8,9,7][i]} subjects</div><div className="flex gap-2 mt-4 flex-wrap">{["Mathematics","Science","English"].slice(0,i%2?2:3).map(x=><span key={x} className="pill bg-slate-50 text-slate-500">{x}</span>)}</div><button className="text-xs text-[#4169e1] font-bold mt-5" onClick={()=>notify(`Opening ${c}`)}>View class details →</button></div>)}</div></div>}
          {section === "Reports" && <div><PageHeading eyebrow="DATA & INSIGHTS" title="Attendance reports" desc="Understand attendance patterns across your campus." action={<button className="btn-primary" onClick={()=>notify("Export is a UI placeholder; report generation will be connected later.")}><Download size={15}/> Export report</button>}/><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"><Metric title="Average attendance" value="92.4%" change="+2.4%" icon={TrendingUp} tone="green"/><Metric title="Students at risk" value="18" change="Needs attention" icon={AlertTriangle} tone="orange"/><Metric title="Late arrivals" value="36" change="-8.2%" icon={Clock3} tone="purple"/></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5"><div className="card p-5"><div className="font-extrabold text-sm">Attendance trend</div><div className="text-xs muted mt-1">Last six school days · sample data</div><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4169e1" stopOpacity={.2}/><stop offset="100%" stopColor="#4169e1" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef1f7" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#94a3b8"}}/><YAxis domain={[70,100]} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip/><Area type="monotone" dataKey="rate" stroke="#4169e1" fill="url(#reportFill)" strokeWidth={3}/></AreaChart></ResponsiveContainer></div></div><div className="card p-5"><div className="font-extrabold text-sm">Attendance by grade</div><div className="text-xs muted mt-1">Current week · sample data</div><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={week} layout="vertical"><CartesianGrid stroke="#eef1f7" strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,100]} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis dataKey="name" type="category" tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false} width={65}/><Tooltip/><Bar dataKey="value" fill="#7655d8" radius={[0,6,6,0]} barSize={13}/></BarChart></ResponsiveContainer></div></div></div><div className="card p-5 mt-5"><div className="font-extrabold text-sm mb-3">AI insight preview</div><div className="flex gap-3 bg-violet-50 rounded-xl p-4"><Sparkles size={18} className="text-violet-600 shrink-0"/><div><div className="text-xs font-bold text-violet-900">Attendance pattern to review</div><p className="text-xs text-violet-800 mt-1 leading-relaxed">Grade 9 shows a sample attendance dip on Thursdays. Once connected to real timetable and attendance data, EduTrack AI can surface explainable trends for staff review.</p></div></div></div></div>}
          {section === "Settings" && <div><PageHeading eyebrow="CONFIGURATION" title="School settings" desc="Manage your institution profile, attendance policies and access."/><div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6"><SettingsCard title="Institution profile" desc="School name, academic year, address and contact details" icon={School}/><SettingsCard title="Attendance rules" desc="Late thresholds, grace period, half-day and leave rules" icon={ClipboardCheck}/><SettingsCard title="User access & roles" desc="Super Admin, School Admin, Teachers, Students and Parents" icon={ShieldCheck}/><SettingsCard title="Notifications" desc="Parent SMS, WhatsApp preferences and attendance alerts" icon={Bell}/><SettingsCard title="Biometric privacy" desc="Consent, retention, access and deletion policy controls" icon={ScanFace}/><SettingsCard title="Devices & cameras" desc="Webcam, mobile camera and CCTV gateway configuration" icon={Camera}/></div><div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mt-5 text-xs text-blue-800 flex gap-2"><CircleHelp size={16} className="shrink-0"/>These are interface previews. Authentication, settings persistence and permission enforcement are not connected yet.</div></div>}
        </div>
        {notice && <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl z-50">{notice}</div>}
        {showModal && <div className="fixed inset-0 bg-slate-950/40 z-50 grid place-items-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"><div className="flex justify-between items-center"><div className="font-extrabold">Start attendance session</div><button onClick={()=>setShowModal(false)}><X size={18}/></button></div><p className="text-xs muted mt-2">Choose a class and subject to prepare a teacher-led session.</p><label className="block text-xs font-bold mt-5 mb-2">Class / section</label><select className="w-full border border-slate-200 rounded-lg p-3 text-xs"><option>Grade 10 · Section A</option><option>Grade 9 · Section A</option><option>Grade 8 · Section B</option></select><label className="block text-xs font-bold mt-4 mb-2">Subject</label><select className="w-full border border-slate-200 rounded-lg p-3 text-xs"><option>Mathematics</option><option>Science</option><option>English</option></select><button className="btn-primary w-full justify-center mt-5" onClick={()=>{setShowModal(false);setSection("Live Attendance");notify("Session prepared in demo mode.");}}>Continue to camera <ChevronRight size={14}/></button></div></div>}
      </main>
    </div>
  );
}

function PageHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:React.ReactNode}) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-extrabold tracking-[1.5px] text-[#7655d8] mb-2">{eyebrow}</div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1><p className="text-xs muted mt-2">{desc}</p></div>{action}</div>;
}
function MiniMetric({label,value,tone}:{label:string;value:string;tone:string}) {
  const tones:Record<string,string>={green:"bg-emerald-50 text-emerald-700",orange:"bg-amber-50 text-amber-700",purple:"bg-violet-50 text-violet-700",blue:"bg-blue-50 text-blue-700"};
  return <div className="rounded-xl bg-slate-50 p-3"><div className={`text-xl font-extrabold ${tones[tone].split(" ")[1]}`}>{value}</div><div className="text-[10px] muted mt-1">{label}</div></div>;
}
function Metric({title,value,change,icon:Icon,tone}:{title:string;value:string;change:string;icon:typeof TrendingUp;tone:string}) {
  const styles:Record<string,string>={green:"bg-emerald-50 text-emerald-600",orange:"bg-amber-50 text-amber-600",purple:"bg-violet-50 text-violet-600"};
  return <div className="card p-5"><div className="flex justify-between"><div className="text-xs muted">{title}</div><div className={`w-9 h-9 rounded-xl grid place-items-center ${styles[tone]}`}><Icon size={17}/></div></div><div className="text-2xl font-extrabold mt-3">{value}</div><div className="text-[10px] muted mt-1">{change}</div></div>;
}
function SettingsCard({title,desc,icon:Icon}:{title:string;desc:string;icon:typeof School}) {
  return <div className="card p-5 flex gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center shrink-0"><Icon size={18}/></div><div className="min-w-0"><div className="text-sm font-extrabold">{title}</div><div className="text-xs muted mt-1">{desc}</div><button className="text-[11px] font-bold text-[#4169e1] mt-3">Configure →</button></div></div>;
}
function Overview({setSection,notify}:{setSection:(s:Section)=>void;notify:(s:string)=>void}) {
  return <>
    <PageHeading eyebrow="CAMPUS OVERVIEW" title="Your school at a glance" desc="Here’s what’s happening across your campus today." action={<button className="btn-primary" onClick={()=>setSection("Live Attendance")}><Camera size={15}/> Take attendance</button>}/>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
      <Metric title="Total students" value="1,284" change="Across 38 sections" icon={Users} tone="purple"/>
      <Metric title="Present today" value="1,176" change="91.6% attendance rate" icon={Check} tone="green"/>
      <Metric title="Absent today" value="82" change="6.4% of total students" icon={ArrowDownRight} tone="orange"/>
      <Metric title="Late arrivals" value="26" change="2.0% of total students" icon={Clock3} tone="purple"/>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_.85fr] gap-5 mt-5">
      <div className="card p-5"><div className="flex flex-wrap justify-between items-start gap-3"><div><div className="font-extrabold text-sm">Attendance overview</div><div className="text-xs muted mt-1">Daily attendance trend · sample data</div></div><select className="border border-slate-100 rounded-lg px-3 py-2 text-[10px] text-slate-500 bg-white"><option>This week</option><option>This month</option></select></div><div className="flex gap-6 mt-5"><div><div className="text-2xl font-extrabold">92.4%</div><div className="text-[10px] muted mt-1 flex items-center gap-1"><ArrowUpRight size={12} className="text-emerald-600"/> 3.2% from last week</div></div><div><div className="text-2xl font-extrabold text-slate-400">89.2%</div><div className="text-[10px] muted mt-1">Previous week</div></div></div><div className="h-56 mt-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4169e1" stopOpacity={.2}/><stop offset="100%" stopColor="#4169e1" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef1f7" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#94a3b8"}}/><YAxis domain={[70,100]} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip/><Area type="monotone" dataKey="rate" stroke="#4169e1" fill="url(#overviewFill)" strokeWidth={3}/><Area type="monotone" dataKey="last" stroke="#9b83e8" fill="transparent" strokeDasharray="5 5" strokeWidth={2}/></AreaChart></ResponsiveContainer></div><div className="flex gap-4 text-[10px] muted"><span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-blue-600"/> This week</span><span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-violet-400"/> Last week</span></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div className="font-extrabold text-sm">Today’s snapshot</div><span className="pill bg-emerald-50 text-emerald-700">Live preview</span></div><div className="flex items-center justify-center py-5"><div className="relative w-40 h-40 rounded-full grid place-items-center" style={{background:"conic-gradient(#4169e1 0 91.6%, #f1f4fa 91.6% 100%)"}}><div className="w-32 h-32 bg-white rounded-full grid place-items-center"><div className="text-center"><div className="text-3xl font-extrabold">91.6%</div><div className="text-[10px] muted">Attendance</div></div></div></div></div><div className="space-y-3"><Legend color="#4169e1" label="Present" value="1,176"/><Legend color="#f59e0b" label="Late" value="26"/><Legend color="#ef6475" label="Absent" value="82"/></div><button onClick={()=>setSection("Reports")} className="w-full btn-soft mt-5">View detailed report</button></div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_.75fr] gap-5 mt-5">
      <div className="card"><div className="p-5 flex justify-between items-center"><div><div className="font-extrabold text-sm">Recent attendance activity</div><div className="text-xs muted mt-1">Latest classroom updates · sample data</div></div><button onClick={()=>setSection("Live Attendance")} className="text-[11px] text-[#4169e1] font-bold">View all →</button></div><div className="table-wrap"><table><thead><tr><th>CLASS</th><th>TEACHER</th><th>TIME</th><th>ATTENDANCE</th><th>STATUS</th></tr></thead><tbody>{[["Grade 10 · A","Riya Sharma","09:05 AM","31 / 32"],["Grade 8 · B","Arjun Kumar","09:12 AM","28 / 30"],["Grade 9 · A","Meera Nair","09:18 AM","29 / 29"],["Grade 11 · Sci","Karan Shah","09:25 AM","25 / 27"]].map((r,i)=><tr key={i}><td className="font-bold text-slate-700">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className="pill bg-emerald-50 text-emerald-700">Completed</span></td></tr>)}</tbody></table></div></div>
      <div className="card p-5"><div className="flex justify-between items-center"><div className="font-extrabold text-sm">Needs your attention</div><span className="pill bg-amber-50 text-amber-700">3 alerts</span></div><div className="space-y-4 mt-5"><AlertItem color="orange" title="Attendance shortage" desc="18 students are below the 75% threshold."/><AlertItem color="purple" title="Pending review" desc="5 recognition results need teacher approval."/><AlertItem color="blue" title="Parent updates" desc="12 notification deliveries need checking."/></div><button onClick={()=>notify("Alert center is a UI preview.")} className="text-[11px] text-[#4169e1] font-bold mt-5">Open alert center →</button></div>
    </div>
    <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#426de2] to-[#7957d7] text-white p-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><Sparkles size={21}/></div><div><div className="font-extrabold text-sm">Smarter attendance starts here</div><div className="text-[11px] text-white/75 mt-1">AI-assisted recognition with teacher review and approval.</div></div></div><button onClick={()=>setSection("Live Attendance")} className="bg-white text-[#4e62ce] rounded-lg px-4 py-2.5 text-xs font-extrabold">Explore attendance <ChevronRight size={14} className="inline"/></button></div>
  </>;
}
function Legend({color,label,value}:{color:string;label:string;value:string}) {
  return <div className="flex items-center text-xs"><span className="w-2.5 h-2.5 rounded-full mr-2" style={{background:color}}/><span className="text-slate-500">{label}</span><span className="ml-auto font-extrabold text-slate-700">{value}</span></div>;
}
function AlertItem({color,title,desc}:{color:string;title:string;desc:string}) {
  const styles:Record<string,string>={orange:"bg-amber-50 text-amber-600",purple:"bg-violet-50 text-violet-600",blue:"bg-blue-50 text-blue-600"};
  return <div className="flex gap-3"><div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${styles[color]}`}><AlertTriangle size={15}/></div><div><div className="text-xs font-extrabold">{title}</div><div className="text-[10px] muted mt-1 leading-relaxed">{desc}</div></div></div>;
}
