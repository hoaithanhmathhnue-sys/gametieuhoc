import React, { useState } from 'react';
import { Classroom, Student } from './types';
import { Plus, Trash2, Edit, Upload, Users, School, X, Save, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

type Props = {
  classrooms: Classroom[];
  onChange: (classrooms: Classroom[]) => void;
};

export default function ClassroomManage({ classrooms, onChange }: Props) {
  const [editingClass, setEditingClass] = useState<Partial<Classroom> | null>(null);
  const [editingStudent, setEditingStudent] = useState<{ classId: string; student: Partial<Student> } | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(classrooms[0]?.id || null);

  const activeClass = classrooms.find(c => c.id === activeClassId);

  const saveClass = () => {
    if (!editingClass?.name) return alert('Vui lòng nhập tên lớp');
    const newClass: Classroom = {
      id: editingClass.id || `class_${Date.now()}`,
      name: editingClass.name,
      students: editingClass.students || []
    };
    const idx = classrooms.findIndex(c => c.id === newClass.id);
    if (idx >= 0) {
      const arr = [...classrooms]; arr[idx] = newClass;
      onChange(arr);
    } else {
      onChange([...classrooms, newClass]);
      setActiveClassId(newClass.id);
    }
    setEditingClass(null);
  };

  const deleteClass = (id: string) => {
    if (!confirm('Xóa lớp học này và tất cả học sinh?')) return;
    onChange(classrooms.filter(c => c.id !== id));
    if (activeClassId === id) setActiveClassId(classrooms[0]?.id || null);
  };

  const saveStudent = () => {
    if (!editingStudent?.student.name || !editingStudent.classId) return alert('Vui lòng nhập tên học sinh');
    const newStudent: Student = {
      id: editingStudent.student.id || `stu_${Date.now()}`,
      name: editingStudent.student.name,
      dob: editingStudent.student.dob || '',
      className: editingStudent.student.className || ''
    };
    onChange(classrooms.map(c => {
      if (c.id !== editingStudent.classId) return c;
      const sIdx = c.students.findIndex(s => s.id === newStudent.id);
      if (sIdx >= 0) {
        const arr = [...c.students]; arr[sIdx] = newStudent;
        return { ...c, students: arr };
      }
      return { ...c, students: [...c.students, newStudent] };
    }));
    setEditingStudent(null);
  };

  const deleteStudent = (classId: string, studentId: string) => {
    if (!confirm('Xóa học sinh này?')) return;
    onChange(classrooms.map(c =>
      c.id === classId ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c
    ));
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClassId) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Find header row (look for "Họ và tên" or first row with data)
      let startRow = 0;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];
        if (row && row.some((cell: any) => typeof cell === 'string' && (cell.includes('tên') || cell.includes('Tên') || cell.includes('TÊN')))) {
          startRow = i + 1;
          break;
        }
      }
      if (startRow === 0) startRow = 1; // Skip first row as header

      const newStudents: Student[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        // Try to parse: Col A = Name, Col B = DOB, Col C = Class
        const rawName = String(row[0] || '').trim();
        // If col A is a number (STT), then name is in col B
        let name = rawName;
        let dob = '';
        let className = '';
        
        if (!isNaN(Number(rawName)) && row[1]) {
          // Col A = STT, Col B = Name, Col C = DOB, Col D = Class (or Col C = Class)
          name = String(row[1] || '').trim();
          if (row[2]) {
            const val = row[2];
            // Check if it's a date
            if (typeof val === 'number' && val > 30000) {
              // Excel serial date
              const date = new Date((val - 25569) * 86400 * 1000);
              dob = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            } else {
              dob = String(val).trim();
            }
          }
          if (row[3]) className = String(row[3]).trim();
          else if (row[2] && typeof row[2] === 'string' && !row[2].includes('/')) className = String(row[2]).trim();
        } else {
          // Col A = Name, Col B = DOB, Col C = Class
          if (row[1]) {
            const val = row[1];
            if (typeof val === 'number' && val > 30000) {
              const date = new Date((val - 25569) * 86400 * 1000);
              dob = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            } else {
              dob = String(val).trim();
            }
          }
          if (row[2]) className = String(row[2]).trim();
        }
        
        if (name && name.length > 1) {
          newStudents.push({
            id: `stu_${Date.now()}_${i}`,
            name,
            dob,
            className: className || activeClass?.name || ''
          });
        }
      }

      if (newStudents.length === 0) return alert('Không tìm thấy học sinh nào trong file.');
      if (confirm(`Tìm thấy ${newStudents.length} học sinh. Thêm vào lớp "${activeClass?.name}"?`)) {
        onChange(classrooms.map(c =>
          c.id === activeClassId ? { ...c, students: [...c.students, ...newStudents] } : c
        ));
      }
    } catch (err: any) {
      alert('Lỗi đọc file Excel: ' + (err.message || 'Không xác định'));
    }
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left: Class List */}
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><School size={20} className="text-teal-600" /> Danh sách lớp</h2>
          <button onClick={() => setEditingClass({})} className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100"><Plus size={18} /></button>
        </div>
        
        {editingClass && (
          <div className="mb-4 p-3 bg-teal-50 rounded-xl space-y-2 border border-teal-200">
            <input type="text" placeholder="Tên lớp (VD: 10A)" className="w-full p-2 border rounded-lg text-sm" value={editingClass.name || ''} onChange={e => setEditingClass(p => ({ ...p, name: e.target.value }))} autoFocus />
            <div className="flex gap-2">
              <button onClick={saveClass} className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-bold">Lưu</button>
              <button onClick={() => setEditingClass(null)} className="flex-1 bg-gray-200 py-1.5 rounded-lg text-sm font-bold">Hủy</button>
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          {classrooms.map(c => (
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeClassId === c.id ? 'bg-teal-100 border-2 border-teal-300 font-bold text-teal-800' : 'hover:bg-gray-50 border-2 border-transparent'}`}
              onClick={() => setActiveClassId(c.id)}>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-teal-500" />
                <span>{c.name}</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{c.students.length}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingClass(c); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {classrooms.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp nào</p>}
        </div>
      </div>

      {/* Right: Students of selected class */}
      <div className="lg:col-span-3 bg-white p-4 rounded-2xl shadow-sm">
        {activeClass ? (
          <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-lg">📋 Lớp {activeClass.name} — {activeClass.students.length} học sinh</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setEditingStudent({ classId: activeClass.id, student: {} })} className="flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-teal-100"><Plus size={16} /> Thêm HS</button>
                <label className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 cursor-pointer">
                  <Upload size={16} /> Nhập Excel
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                </label>
              </div>
            </div>

            {editingStudent && editingStudent.classId === activeClass.id && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Họ và tên *</label>
                  <input type="text" placeholder="Nguyễn Văn A" className="w-full p-2 border rounded-lg text-sm" value={editingStudent.student.name || ''} onChange={e => setEditingStudent(p => p ? { ...p, student: { ...p.student, name: e.target.value } } : null)} autoFocus />
                </div>
                <div className="w-40">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Ngày sinh</label>
                  <input type="text" placeholder="dd/mm/yyyy" className="w-full p-2 border rounded-lg text-sm" value={editingStudent.student.dob || ''} onChange={e => setEditingStudent(p => p ? { ...p, student: { ...p.student, dob: e.target.value } } : null)} />
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Lớp</label>
                  <input type="text" placeholder="10A" className="w-full p-2 border rounded-lg text-sm" value={editingStudent.student.className || activeClass.name} onChange={e => setEditingStudent(p => p ? { ...p, student: { ...p.student, className: e.target.value } } : null)} />
                </div>
                <button onClick={saveStudent} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Lưu</button>
                <button onClick={() => setEditingStudent(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold">Hủy</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 rounded-tl-lg font-bold text-gray-600 w-12">STT</th>
                    <th className="p-3 font-bold text-gray-600">Họ và tên</th>
                    <th className="p-3 font-bold text-gray-600 w-32">Ngày sinh</th>
                    <th className="p-3 font-bold text-gray-600 w-20">Lớp</th>
                    <th className="p-3 rounded-tr-lg font-bold text-gray-600 w-24 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeClass.students.map((s, i) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-gray-600">{s.dob}</td>
                      <td className="p-3 text-gray-600">{s.className}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setEditingStudent({ classId: activeClass.id, student: s })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={15} /></button>
                          <button onClick={() => deleteStudent(activeClass.id, s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeClass.students.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-bold">Chưa có học sinh</p>
                  <p className="text-sm mt-1">Thêm thủ công hoặc nhập từ file Excel</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <School size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-bold">Chọn hoặc tạo lớp học</p>
            <p className="text-sm mt-1">Nhấn nút + ở bên trái để tạo lớp mới</p>
          </div>
        )}
      </div>
    </div>
  );
}
