export const users = [];
export const initialCourses = [];

export const validateParticipant = (p) => {
  const errors = [];
  if (!p.name || p.name.trim() === '') errors.push('missing_name');
  if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push('invalid_email');
  if (!p.phone || !/^05\d{8}$/.test(p.phone.replace(/[\s\-]/g, ''))) errors.push('invalid_phone');
  if (!p.nationalId || !/^\d{10}$/.test(p.nationalId.replace(/\s/g, ''))) errors.push('invalid_id');
  if (!p.organization || p.organization.trim() === '') errors.push('missing_org');
  return errors;
};

export const errorLabels = {
  invalid_email: 'البريد الإلكتروني غير صحيح',
  invalid_phone: 'رقم الجوال غير صحيح (يجب أن يبدأ بـ 05)',
  invalid_id: 'رقم الهوية غير صحيح (10 أرقام)',
  missing_org: 'الجهة مفقودة',
  missing_name: 'الاسم مفقود',
  duplicate: 'إدخال مكرر',
};

export const statusConfig = {
  pending_upload: { label: 'بانتظار الأسماء', badge: 'badge-pending',   icon: '⏳', color: '#64748b' },
  uploaded:       { label: 'تم الرفع',          badge: 'badge-uploaded', icon: '📤', color: '#1d4ed8' },
  has_errors:     { label: 'يحتوي أخطاء',       badge: 'badge-errors',   icon: '⚠',  color: '#73384B' },
  corrected:      { label: 'جاهز للاعتماد',     badge: 'badge-corrected',icon: '✏',  color: '#b45309' },
  approved:       { label: 'معتمدة',            badge: 'badge-approved', icon: '✅', color: '#1a7a3c' },
  received:       { label: 'مستلمة بعمليات',   badge: 'badge-received', icon: '📬', color: '#6d28d9' },
  exported:       { label: 'تم التصدير',        badge: 'badge-exported', icon: '💾', color: '#065f46' },
  lms_uploaded:   { label: 'مرفوعة على LMS',    badge: 'badge-lms',      icon: '🎓', color: '#0369a1' },
};
