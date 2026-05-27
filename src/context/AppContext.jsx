import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { validateParticipant } from '../data/mockData';

const AppContext = createContext(null);
const STORAGE_KEY = 'niss_courses_v3';
const USERS_KEY   = 'niss_users_v1';

const ADMIN = {
  id: 'admin',
  name: 'نايف الشهراني',
  email: 'nalshahrani@nauss.edu.sa',
  password: 'Zx.321321',
  role: 'manager',
  isAdmin: true,
  avatar: 'ن',
};

export const ROLE_LABELS = {
  manager:      'مدير عام',
  business_dev: 'موظف تطوير أعمال',
  training_ops: 'موظف عمليات تدريب',
};

const COL_MAP = {
  name:         ['الاسم الكامل', 'الاسم', 'اسم', 'اسم المشارك', 'name', 'full name', 'المشترك'],
  nationalId:   ['رقم الهوية', 'الهوية', 'هوية', 'رقم الهوية الوطنية', 'national id', 'id', 'هوية وطنية'],
  email:        ['البريد الإلكتروني', 'البريد', 'بريد', 'إيميل', 'ايميل', 'email', 'e-mail'],
  phone:        ['رقم الجوال', 'الجوال', 'هاتف', 'رقم الهاتف', 'phone', 'mobile', 'موبايل'],
  organization: ['الجهة', 'جهة العمل', 'جهة', 'المنظمة', 'الشركة', 'organization', 'org', 'company', 'جهة المرسلة'],
  jobTitle:     ['المسمى الوظيفي', 'المسمى', 'مسمى', 'وظيفة', 'الوظيفة', 'job title', 'title', 'position'],
};

const findCol = (headers, keys) => {
  for (const kw of keys) {
    const i = headers.findIndex(h => String(h).trim().toLowerCase().includes(kw.toLowerCase()));
    if (i >= 0) return i;
  }
  return -1;
};

export const mapExcelRows = (rows) => {
  if (!rows || rows.length < 2) return { participants: [], mapping: {}, headers: [] };
  const headers = rows[0].map(h => String(h ?? '').trim());
  const mapping = {};
  for (const [field, keys] of Object.entries(COL_MAP)) {
    mapping[field] = findCol(headers, keys);
  }
  const participants = rows.slice(1)
    .filter(row => row && row.some(c => c !== undefined && String(c) !== ''))
    .map((row, i) => {
      const get = (field) => mapping[field] >= 0 ? String(row[mapping[field]] ?? '').trim() : '';
      const p = {
        id: `P_${Date.now()}_${i}`,
        name: get('name'), nationalId: get('nationalId'),
        email: get('email'), phone: get('phone'),
        organization: get('organization'), jobTitle: get('jobTitle'),
        errors: [], corrected: false, isDuplicate: false,
      };
      p.errors = validateParticipant(p);
      return p;
    });
  const seen = {};
  participants.forEach(p => { if (p.nationalId) seen[p.nationalId] = (seen[p.nationalId] || 0) + 1; });
  participants.forEach(p => {
    if (p.nationalId && seen[p.nationalId] > 1) {
      if (!p.errors.includes('duplicate')) p.errors.push('duplicate');
      p.isDuplicate = true;
    }
  });
  return { participants, mapping, headers };
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('niss_user'));
      return (stored && stored.email && stored.role) ? stored : null;
    } catch { return null; }
  });

  // Manager can preview any role without logging out
  const [viewRole, setViewRole] = useState(null); // null = use actual role

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(USERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); } catch {}
  }, [courses]);

  useEffect(() => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
  }, [users]);

  useEffect(() => {
    try { sessionStorage.setItem('niss_user', JSON.stringify(currentUser)); } catch {}
  }, [currentUser]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const login = useCallback((email, password) => {
    if (email.trim().toLowerCase() === ADMIN.email.toLowerCase() && password === ADMIN.password) {
      setCurrentUser({ id: ADMIN.id, name: ADMIN.name, email: ADMIN.email, avatar: ADMIN.avatar, role: 'manager', isAdmin: true });
      return true;
    }
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (found) {
      setCurrentUser({ id: found.id, name: found.name, email: found.email, avatar: found.name[0] || 'م', role: found.role });
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('niss_user');
  }, []);

  const register = useCallback((userData) => {
    const emailLower = userData.email.trim().toLowerCase();
    if (emailLower === ADMIN.email.toLowerCase()) return { ok: false, error: 'هذا البريد الإلكتروني مستخدم بالفعل' };
    const currentUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (currentUsers.some(u => u.email.toLowerCase() === emailLower)) return { ok: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
    const newUser = {
      id: `U_${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password,
      role: userData.role,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.name[0] || 'م', role: newUser.role });
    return { ok: true };
  }, []);

  const updateUser = useCallback((userId, updates) => {
    setUsers(prev => prev.map(u => u.id !== userId ? u : { ...u, ...updates }));
    showToast('تم تحديث بيانات المستخدم', 'success');
  }, [showToast]);

  const deleteUser = useCallback((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    showToast('تم حذف المستخدم', 'info');
  }, [showToast]);

  const createUser = useCallback((userData) => {
    const emailLower = userData.email.trim().toLowerCase();
    if (emailLower === ADMIN.email.toLowerCase()) return { ok: false, error: 'هذا البريد الإلكتروني مستخدم بالفعل' };
    const currentUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (currentUsers.some(u => u.email.toLowerCase() === emailLower)) return { ok: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
    const newUser = {
      id: `U_${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password,
      role: userData.role,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    showToast(`تم إنشاء حساب ${newUser.name}`, 'success');
    return { ok: true };
  }, [showToast]);

  const createCourse = useCallback((data) => {
    const id = `C_${Date.now()}`;
    const num = String(courses.length + 1).padStart(3, '0');
    const code = `NAUSS-${new Date().getFullYear()}-${num}`;
    setCourses(prev => [...prev, {
      id, code,
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate || '',
      location: data.location.trim(),
      capacity: parseInt(data.capacity) || 20,
      nominationLetter: data.nominationLetter?.trim() || '',
      status: 'pending_upload',
      uploadedAt: null, approvedAt: null, receivedAt: null,
      exportedAt: null, lmsUploadedAt: null, lmsUploadResult: null,
      daysLate: 0, qualityScore: 0,
      participants: [],
      createdAt: new Date().toISOString(),
      auditLog: [{ action: 'إنشاء النشاط التدريبي', user: ADMIN.name, at: new Date().toISOString() }],
    }]);
    showToast(`تم إنشاء النشاط: ${data.name}`, 'success');
    return id; // ← return ID so caller can navigate directly to editor
  }, [courses.length, showToast]);

  const deleteCourse = useCallback((courseId) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    showToast('تم حذف النشاط', 'info');
  }, [showToast]);

  const uploadParticipants = useCallback((courseId, participants, filename) => {
    const errCount = participants.filter(p => p.errors?.length > 0).length;
    const qs = participants.length > 0 ? Math.round(((participants.length - errCount) / participants.length) * 100) : 0;
    setCourses(prev => prev.map(c =>
      c.id !== courseId ? c : {
        ...c, participants,
        status: errCount > 0 ? 'has_errors' : 'corrected',
        uploadedAt: new Date().toISOString(),
        qualityScore: qs, sourceFile: filename,
        auditLog: [...(c.auditLog || []), {
          action: `رُفع "${filename}" — ${participants.length} مشارك، ${errCount} أخطاء`,
          at: new Date().toISOString(),
        }],
      }
    ));
    showToast(
      errCount > 0
        ? `تم رفع ${participants.length} مشارك — ${errCount} بيانات تحتاج تصحيح`
        : `تم رفع ${participants.length} مشارك — لا أخطاء ✓`,
      errCount > 0 ? 'error' : 'success'
    );
  }, [showToast]);

  const correctParticipant = useCallback((courseId, participantId, updates) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const parts = course.participants.map(p => {
        if (p.id !== participantId) return p;
        const merged = { ...p, ...updates };
        const newErrors = validateParticipant(merged);
        return { ...merged, errors: newErrors, corrected: newErrors.length === 0 };
      });
      const remaining = parts.filter(p => p.errors?.length > 0).length;
      const qs = parts.length > 0 ? Math.round(((parts.length - remaining) / parts.length) * 100) : 100;
      return { ...course, participants: parts, status: remaining === 0 ? 'corrected' : course.status, qualityScore: qs };
    }));
  }, []);

  const removeDuplicate = useCallback((courseId, participantId) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const without = course.participants.filter(p => p.id !== participantId);
      const seen = {};
      without.forEach(p => { if (p.nationalId) seen[p.nationalId] = (seen[p.nationalId] || 0) + 1; });
      const parts = without.map(p => {
        if (p.isDuplicate && seen[p.nationalId] <= 1) {
          const newErrors = p.errors.filter(e => e !== 'duplicate');
          return { ...p, errors: newErrors, isDuplicate: false };
        }
        return p;
      });
      const remaining = parts.filter(p => p.errors?.length > 0).length;
      const qs = parts.length > 0 ? Math.round(((parts.length - remaining) / parts.length) * 100) : 100;
      return { ...course, participants: parts, status: remaining === 0 ? 'corrected' : course.status, qualityScore: qs };
    }));
    showToast('تم حذف الإدخال المكرر', 'success');
  }, [showToast]);

  const addParticipantsManually = useCallback((courseId, newParticipants) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const merged = [...course.participants, ...newParticipants];
      const seen = {};
      merged.forEach(p => { if (p.nationalId) seen[p.nationalId] = (seen[p.nationalId] || 0) + 1; });
      const parts = merged.map(p => {
        const hasDup = p.nationalId && seen[p.nationalId] > 1;
        const errs = [...(p.errors || []).filter(e => e !== 'duplicate')];
        if (hasDup) errs.push('duplicate');
        return { ...p, errors: errs, isDuplicate: hasDup };
      });
      const errCount = parts.filter(p => p.errors?.length > 0).length;
      const qs = parts.length > 0 ? Math.round(((parts.length - errCount) / parts.length) * 100) : 0;
      return {
        ...course, participants: parts,
        status: errCount > 0 ? 'has_errors' : parts.length > 0 ? 'corrected' : 'pending_upload',
        uploadedAt: course.uploadedAt || new Date().toISOString(),
        qualityScore: qs,
      };
    }));
    showToast(`تمت إضافة ${newParticipants.length} مشارك`, 'success');
  }, [showToast]);

  const approveCourse = useCallback((courseId) => {
    setCourses(prev => prev.map(c =>
      c.id !== courseId ? c : {
        ...c, status: 'approved', approvedAt: new Date().toISOString(),
        auditLog: [...(c.auditLog || []), { action: 'اعتماد القائمة رسمياً وإحالتها لعمليات التدريب', at: new Date().toISOString() }],
      }
    ));
    showToast('اعتُمدت القائمة وأُحيلت إلى عمليات التدريب ✅', 'success');
  }, [showToast]);

  const receiveCourse = useCallback((courseId) => {
    setCourses(prev => prev.map(c =>
      c.id !== courseId ? c : {
        ...c, status: 'received', receivedAt: new Date().toISOString(),
        auditLog: [...(c.auditLog || []), { action: 'استلام القائمة من تطوير الأعمال', at: new Date().toISOString() }],
      }
    ));
    showToast('تم استلام القائمة بنجاح', 'success');
  }, [showToast]);

  const exportLMS = useCallback((courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;
    setCourses(prev => prev.map(c =>
      c.id !== courseId ? c : {
        ...c, status: 'exported', exportedAt: new Date().toISOString(),
        auditLog: [...(c.auditLog || []), {
          action: `تصدير ملف LMS — ${course.participants.length} مشارك`,
          at: new Date().toISOString(),
        }],
      }
    ));
    showToast(`تم تصدير ملف LMS — ${course.participants.length} مشارك`, 'success');
    return course;
  }, [courses, showToast]);

  const recordLMSUpload = useCallback((courseId, result, notes) => {
    setCourses(prev => prev.map(c =>
      c.id !== courseId ? c : {
        ...c,
        status: result === 'success' ? 'lms_uploaded' : 'exported',
        lmsUploadedAt: new Date().toISOString(),
        lmsUploadResult: result, lmsNotes: notes || '',
        auditLog: [...(c.auditLog || []), {
          action: result === 'success' ? 'الرفع على LMS ناجح ✅' : `فشل الرفع على LMS: ${notes}`,
          at: new Date().toISOString(),
        }],
      }
    ));
    showToast(result === 'success' ? 'تم الرفع على LMS بنجاح' : 'تم تسجيل فشل الرفع', result === 'success' ? 'success' : 'error');
  }, [showToast]);

  return (
    <AppContext.Provider value={{
      currentUser, courses, toasts, users,
      viewRole, setViewRole,
      login, logout, register, updateUser, deleteUser, createUser,
      createCourse, deleteCourse,
      uploadParticipants, correctParticipant, removeDuplicate, addParticipantsManually,
      approveCourse, receiveCourse, exportLMS, recordLMSUpload,
      showToast, ROLE_LABELS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
