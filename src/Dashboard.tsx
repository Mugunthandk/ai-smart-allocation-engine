import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  Search, 
  User as UserIcon,
  Plus,
  LayoutDashboard,
  LogOut,
  Settings,
  BarChart3,
  Users,
  Building2,
  Cpu,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Award,
  FileText,
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Internship, Application, Allocation } from './types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile State
  const [profile, setProfile] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [resumeText, setResumeText] = useState('');
  
  // Profile Edit State
  const [editProfile, setEditProfile] = useState({
    college: '',
    branch: '',
    cgpa: 0,
    skills: '',
    preferences: ''
  });
  
  // AI Recommendation State
  const [recommendationReasons, setRecommendationReasons] = useState<Record<number, string>>({});
  const [loadingReason, setLoadingReason] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const [adminData, setAdminData] = useState<{ students: any[], companies: any[] }>({ students: [], companies: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      if (user?.role === 'student') {
        const [profRes, intRes, appRes] = await Promise.all([
          fetch('/api/student/profile', { headers }),
          fetch('/api/internships', { headers }),
          fetch('/api/student/applications', { headers })
        ]);
        const profData = await profRes.json();
        setProfile(profData);
        setInternships(await intRes.json());
        setApplications(await appRes.json());
        setEditProfile({
          college: profData.college || '',
          branch: profData.branch || '',
          cgpa: profData.cgpa || 0,
          skills: profData.skills ? JSON.parse(profData.skills).join(', ') : '',
          preferences: profData.preferences ? JSON.parse(profData.preferences).join(', ') : ''
        });
      } else if (user?.role === 'company') {
        const [intRes] = await Promise.all([
          fetch('/api/company/internships', { headers })
        ]);
        setInternships(await intRes.json());
      } else if (user?.role === 'admin') {
        const [statsRes, allocRes, studentsRes, companiesRes] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/allocations', { headers }),
          fetch('/api/admin/students', { headers }),
          fetch('/api/admin/companies', { headers })
        ]);
        setStats(await statsRes.json());
        setAllocations(await allocRes.json());
        setAdminData({
          students: await studentsRes.json(),
          companies: await companiesRes.json()
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleApply = async (internshipId: number) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ internship_id: internshipId })
      });
      if (res.ok) {
        alert('Application submitted successfully!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAllocation = async () => {
    try {
      const res = await fetch('/api/admin/run-allocation', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Allocation process completed!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Simulate reading file text
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setResumeText(text);
      // Automatically trigger scan after upload
      handleScanResumeWithText(text);
    };
    reader.readAsText(file);
  };

  const handleScanResumeWithText = async (text: string) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/student/scan-resume', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resumeText: text })
      });
      const data = await res.json();
      if (res.ok) {
        const currentSkills = JSON.parse(profile.skills || '[]');
        const updatedSkills = [...new Set([...currentSkills, ...data.skills])];
        
        await fetch('/api/student/profile', {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            ...profile, 
            skills: updatedSkills,
            cgpa: data.cgpa || profile.cgpa,
            experience_score: data.experience_score || profile.experience_score
          })
        });
        alert('AI Analysis complete! Profile updated with extracted skills and metrics.');
        setResumeText('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
    setIsScanning(false);
  };

  const handleScanResume = () => handleScanResumeWithText(resumeText);

  const handleSaveProfile = async () => {
    try {
      const skillsArray = editProfile.skills.split(',').map(s => s.trim()).filter(s => s !== '');
      const prefsArray = editProfile.preferences.split(',').map(p => p.trim()).filter(p => p !== '');
      
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editProfile,
          skills: skillsArray,
          preferences: prefsArray
        })
      });
      
      if (res.ok) {
        alert('Profile updated successfully!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendationReason = async (internshipId: number) => {
    if (recommendationReasons[internshipId]) return;
    setLoadingReason(internshipId);
    try {
      const res = await fetch('/api/ai/recommendation-reason', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ internshipId })
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendationReasons(prev => ({ ...prev, [internshipId]: data.reason }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingReason(null);
  };

  const calculateMatchScore = (internship: Internship) => {
    if (!profile) return 0;
    const studentSkills = JSON.parse(profile.skills || '[]');
    const requiredSkills = JSON.parse(internship.required_skills || '[]');
    const studentPrefs = JSON.parse(profile.preferences || '[]');

    const skillMatchCount = requiredSkills.filter((s: string) => 
      studentSkills.some((ss: string) => ss.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ss.toLowerCase()))
    ).length;
    const skillMatchPercent = requiredSkills.length > 0 ? skillMatchCount / requiredSkills.length : 0;
    const cgpaScore = (profile.cgpa || 0) / 10;
    const prefMatch = studentPrefs.some((p: string) => internship.role.toLowerCase().includes(p.toLowerCase())) ? 1 : 0;
    const experienceScore = Math.min((profile.experience_score || 0) / 10, 1);

    return (0.5 * skillMatchPercent) + (0.2 * cgpaScore) + (0.2 * experienceScore) + (0.1 * prefMatch);
  };

  const renderStudentDashboard = () => {
    const sortedInternships = [...internships].sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
    const topMatch = sortedInternships[0];
    const appliedCount = applications.length;
    const allocatedApp = applications.find(a => a.status === 'allocated');

    return (
      <div className="space-y-8">
        {/* Top Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <Sparkles size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Top Recommendation</span>
              </div>
              {topMatch ? (
                <>
                  <h3 className="text-2xl font-bold mb-1">{topMatch.role}</h3>
                  <p className="text-indigo-100 mb-4">{topMatch.company_name}</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl">
                      <div className="text-2xl font-bold">{(calculateMatchScore(topMatch) * 100).toFixed(0)}%</div>
                      <div className="text-[10px] uppercase font-bold opacity-70">Match Score</div>
                    </div>
                    <button 
                      onClick={() => handleApply(topMatch.id)}
                      className="bg-white text-indigo-600 px-6 py-2 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all"
                    >
                      Apply Now
                    </button>
                  </div>
                </>
              ) : (
                <p>No recommendations yet. Complete your profile!</p>
              )}
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
              <Briefcase size={200} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 w-fit mb-4">
              <Award size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-stone-900">{appliedCount}</div>
              <div className="text-sm text-stone-500 font-medium">Applied Internships</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="bg-rose-100 p-3 rounded-2xl text-rose-600 w-fit mb-4">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-stone-900">{profile?.cgpa || '0.0'}</div>
              <div className="text-sm text-stone-500 font-medium">Academic CGPA</div>
            </div>
          </div>
        </div>

        {/* AI Resume Analyzer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                AI Resume Analyzer
              </h3>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                Upload your resume (PDF/Text) or paste content. Our Gemini-powered engine will extract skills and calculate metrics.
              </p>
              
              <div className="mb-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-200 border-dashed rounded-2xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Plus className="w-8 h-8 mb-2 text-stone-400" />
                    <p className="text-xs text-stone-500 font-bold">Upload Resume</p>
                  </div>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.pdf" />
                </label>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase">
                  <span className="bg-white px-2 text-stone-400">Or Paste Text</span>
                </div>
              </div>

              <textarea 
                placeholder="Paste resume content here..."
                className="w-full h-32 p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4 transition-all resize-none"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              <button 
                onClick={handleScanResume}
                disabled={isScanning || !resumeText}
                className="w-full bg-stone-900 text-white py-3 rounded-2xl font-bold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {isScanning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : <Sparkles size={18} />}
                {isScanning ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                Your Top Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile?.skills ? JSON.parse(profile.skills).map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                    {skill}
                  </span>
                )) : <p className="text-xs text-stone-400 italic">No skills extracted yet.</p>}
              </div>
            </div>
          </div>

          {/* Internship Recommendations List */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Smart Recommendations</h2>
                <p className="text-xs text-stone-500">Ranked by AI Match Score</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-indigo-600 transition-all">
                  <Search size={18} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {sortedInternships.map((internship) => {
                const score = calculateMatchScore(internship);
                const isApplied = applications.some(a => a.internship_id === internship.id);
                
                return (
                  <div key={internship.id} className="p-6 hover:bg-stone-50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 group-hover:text-indigo-600 transition-all">{internship.role}</h4>
                          <p className="text-sm text-stone-500">{internship.company_name} • {internship.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${(score * 100) > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {(score * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] uppercase font-bold text-stone-400">Match</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {JSON.parse(internship.required_skills).map((skill: string) => (
                        <span key={skill} className="px-2 py-1 bg-stone-100 text-stone-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <AnimatePresence>
                      {recommendationReasons[internship.id] && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs text-indigo-800 leading-relaxed italic"
                        >
                          <Sparkles size={14} className="inline mr-2 mb-1" />
                          {recommendationReasons[internship.id]}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-6">
                      <button 
                        onClick={() => fetchRecommendationReason(internship.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        {loadingReason === internship.id ? 'Thinking...' : recommendationReasons[internship.id] ? 'AI Reason' : 'Why this match?'}
                        <ChevronRight size={14} />
                      </button>
                      <button 
                        onClick={() => handleApply(internship.id)}
                        disabled={isApplied}
                        className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${
                          isApplied 
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                            : 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-200'
                        }`}
                      >
                        {isApplied ? 'Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyDashboard = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Talent Acquisition</h2>
          <p className="text-stone-500">Manage your internship opportunities and candidates.</p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
          <Plus size={20} />
          Post Internship
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {internships.map((internship) => (
          <div key={internship.id} className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 hover:border-indigo-300 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-stone-100 p-3 rounded-2xl text-stone-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                <Briefcase size={24} />
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-100">
                {internship.seats} Openings
              </span>
            </div>
            <h3 className="font-bold text-xl text-stone-900 mb-2">{internship.role}</h3>
            <p className="text-sm text-stone-500 mb-6 line-clamp-3 leading-relaxed">{internship.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {JSON.parse(internship.required_skills).map((skill: string) => (
                <span key={skill} className="px-2 py-1 bg-stone-50 text-stone-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-stone-100">
                  {skill}
                </span>
              ))}
            </div>
            
            <button className="w-full py-3 bg-stone-50 text-stone-900 rounded-2xl text-sm font-bold hover:bg-stone-100 transition-all border border-stone-100">
              Review Candidates
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-8">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: stats?.students?.count, icon: GraduationCap, color: 'indigo', sub: 'Active Registrations' },
          { label: 'Total Internships', value: stats?.internships?.count, icon: Briefcase, color: 'emerald', sub: 'Open Opportunities' },
          { label: 'Allocated Students', value: stats?.allocations?.count, icon: CheckCircle, color: 'amber', sub: 'Successful Matches' },
          { label: 'Allocation Rate', value: `${stats?.allocation_rate || 0}%`, icon: TrendingUp, color: 'rose', sub: 'System Efficiency' },
        ].map((item) => (
          <div key={item.label} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all">
            <div className={`bg-${item.color}-50 p-4 rounded-2xl text-${item.color}-600 w-fit mb-6`}>
              <item.icon size={28} />
            </div>
            <div className="text-4xl font-bold text-stone-900 mb-1 tracking-tight">{item.value || 0}</div>
            <div className="text-sm text-stone-900 font-bold uppercase tracking-wider">{item.label}</div>
            <div className="text-xs text-stone-400 mt-1">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Allocation Analytics Area Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-lg">
                <BarChart3 size={20} className="text-indigo-600" />
                Allocation Performance
              </h3>
              <p className="text-xs text-stone-400 mt-1">Monthly allocation growth and system throughput.</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Jan', value: 20 },
                { name: 'Feb', value: 45 },
                { name: 'Mar', value: stats?.allocations?.count || 0 }
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Distribution Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2 text-lg">
            <PieChartIcon size={20} className="text-indigo-600" />
            Skill Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.top_skills || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {(stats?.top_skills || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-stone-400 mt-4 leading-relaxed">
            Distribution of technical skills required across all posted internships.
          </p>
        </div>
      </div>

      {/* Second Row: Market Demand & ML Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Demand Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-8 flex items-center gap-2 text-lg">
            <TrendingUp size={20} className="text-indigo-600" />
            Market Demand Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.top_skills || []}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e'}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="#4f46e5" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ML Engine Status Card */}
        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-white/20 p-2 rounded-xl">
                <Cpu size={24} />
              </div>
              <span className="font-bold text-lg">Predictive Engine</span>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-70">Model Type</span>
                <span className="font-bold">Logistic Regression</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-70">Success Prediction</span>
                <span className="font-bold">Active</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-70">Training Data</span>
                <span className="font-bold">Real-time Sync</span>
              </div>
            </div>
            <button 
              onClick={handleRunAllocation}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              Run Smart Allocation
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
            <Cpu size={200} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-stone-100">
            <h3 className="font-bold text-stone-900">Registered Students</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-stone-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-8 py-4">Name</th>
                  <th className="px-8 py-4">College</th>
                  <th className="px-8 py-4">CGPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {adminData.students.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50 transition-all">
                    <td className="px-8 py-4 font-bold text-stone-900 text-sm">{s.name}</td>
                    <td className="px-8 py-4 text-stone-500 text-sm">{s.college}</td>
                    <td className="px-8 py-4 text-stone-500 text-sm font-bold">{s.cgpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-stone-100">
            <h3 className="font-bold text-stone-900">Partner Companies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-stone-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-8 py-4">Company</th>
                  <th className="px-8 py-4">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {adminData.companies.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-all">
                    <td className="px-8 py-4 font-bold text-stone-900 text-sm">{c.name}</td>
                    <td className="px-8 py-4 text-stone-500 text-sm">{c.industry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-bold text-stone-900">Recent Allocations</h3>
          <button className="text-xs font-bold text-indigo-600 hover:underline">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-4">Student</th>
                <th className="px-8 py-4">Company</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Match Score</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-stone-50 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {alloc.student_name.charAt(0)}
                      </div>
                      <span className="font-bold text-stone-900 text-sm">{alloc.student_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-stone-500 text-sm font-medium">{alloc.company_name}</td>
                  <td className="px-8 py-5 text-stone-500 text-sm font-medium">{alloc.role}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${alloc.score * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{(alloc.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-bold mt-1">
                      Prob: {(alloc.success_probability * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                      Allocated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans text-stone-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-stone-200 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Cpu size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight font-display">InternSmart</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          {user?.role === 'student' && (
            <button 
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'applications' ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'}`}
            >
              <Clock size={20} />
              My Applications
            </button>
          )}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'}`}
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>

        <div className="p-6">
          <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-lg border border-stone-100">
                {user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 transition-all"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 max-w-7xl mx-auto w-full">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 font-display tracking-tight mb-2">
              {activeTab === 'overview' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-stone-500 font-medium">
              {user?.role === 'admin' ? 'System-wide performance and allocation control.' : `Welcome back, ${user?.name.split(' ')[0]}.`}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-bold text-stone-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              AI Engine Online
            </div>
            <div className="w-px h-4 bg-stone-200" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border-2 border-indigo-100 animate-spin" />
              <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
            </div>
            <p className="text-stone-400 font-bold text-sm animate-pulse">Initializing Smart Engine...</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {user?.role === 'student' && activeTab === 'overview' && renderStudentDashboard()}
            {user?.role === 'company' && activeTab === 'overview' && renderCompanyDashboard()}
            {user?.role === 'admin' && activeTab === 'overview' && renderAdminDashboard()}
            
            {activeTab === 'settings' && (
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-stone-200 max-w-2xl">
                <h3 className="text-2xl font-bold mb-8 font-display">Profile Settings</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Full Name</label>
                      <input type="text" defaultValue={user?.name} className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Email</label>
                      <input type="email" defaultValue={user?.email} className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none opacity-50" disabled />
                    </div>
                  </div>
                  {user?.role === 'student' && (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">College</label>
                          <input 
                            type="text" 
                            value={editProfile.college} 
                            onChange={(e) => setEditProfile({...editProfile, college: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Branch</label>
                          <input 
                            type="text" 
                            value={editProfile.branch} 
                            onChange={(e) => setEditProfile({...editProfile, branch: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">CGPA</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={editProfile.cgpa} 
                            onChange={(e) => setEditProfile({...editProfile, cgpa: parseFloat(e.target.value)})}
                            className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Skills (Comma separated)</label>
                          <input 
                            type="text" 
                            value={editProfile.skills} 
                            onChange={(e) => setEditProfile({...editProfile, skills: e.target.value})}
                            placeholder="e.g. React, Node.js, Python"
                            className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Preferred Roles (Comma separated)</label>
                        <input 
                          type="text" 
                          value={editProfile.preferences} 
                          onChange={(e) => setEditProfile({...editProfile, preferences: e.target.value})}
                          placeholder="e.g. Full Stack Developer, Data Analyst"
                          className="w-full p-4 rounded-2xl border border-stone-100 bg-stone-50 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                        />
                      </div>
                    </>
                  )}
                  <div className="pt-6">
                    <button 
                      onClick={handleSaveProfile}
                      className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-stone-100">
                  <h3 className="font-bold text-stone-900">Your Applications</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-400 text-[10px] uppercase font-bold tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Internship</th>
                        <th className="px-8 py-4">Company</th>
                        <th className="px-8 py-4">Match Score</th>
                        <th className="px-8 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-stone-50 transition-all">
                          <td className="px-8 py-5 font-bold text-stone-900 text-sm">{app.role}</td>
                          <td className="px-8 py-5 text-stone-500 text-sm font-medium">{app.company_name}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-600">{(app.match_score * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                              app.status === 'allocated' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              app.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-stone-50 text-stone-500 border-stone-100'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
