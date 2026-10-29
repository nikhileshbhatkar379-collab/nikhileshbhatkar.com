// ------------------------------------------------------------------
// Nikhillesh Bhatkar Learning Academy — Admin Dashboard Controller
// ------------------------------------------------------------------

let adminListenersInitialized = false;

function initAdminPortal() {
  // 1. Enforce Authentication (allows both 'admin' and 'faculty')
  const user = Auth.requireAuth('admin');
  if (!user) return;

  // Faculty mode detection
  const isFaculty = user.role === 'faculty';
  window.isFacultyMode = isFaculty;

  const adminDisplayName = document.getElementById('adminDisplayName');
  if (adminDisplayName && user.name) {
    adminDisplayName.textContent = user.name + (isFaculty ? ' (Faculty)' : '');
  }

  // Logout Handler — works for both admin and faculty
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        Auth.logout();
      }
    });
  }

  // 2. Sidebar Tab Navigation — filter for faculty
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  // Tabs allowed for faculty
  const facultyAllowedTabs = ['tab-notes', 'tab-papers', 'tab-tests', 'tab-attendance', 'tab-doubts'];

  // Hide disallowed tabs for faculty
  if (isFaculty) {
    navItems.forEach(btn => {
      const tabId = btn.getAttribute('data-tab');
      if (!facultyAllowedTabs.includes(tabId)) {
        btn.style.display = 'none';
      }
    });
    tabContents.forEach(content => {
      if (!facultyAllowedTabs.includes(content.id)) {
        content.style.display = 'none';
      }
    });
  }

  window.switchAdminTab = function(targetTabId) {
    // Block faculty from accessing disallowed tabs
    if (isFaculty && !facultyAllowedTabs.includes(targetTabId)) {
      return;
    }

    navItems.forEach(btn => {
      if (btn.getAttribute('data-tab') === targetTabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabContents.forEach(content => {
      if (content.id === targetTabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    if (adminSidebar) adminSidebar.classList.remove('open');

    // Faculty defaults to Notes tab instead of Overview
    const defaultTab = isFaculty ? 'tab-notes' : 'tab-overview';
    if (targetTabId) {
      refreshActiveTabData(targetTabId);
    } else {
      window.switchAdminTab(defaultTab);
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      window.switchAdminTab(tabId);
    });
  });

  // Quick Action Buttons on Overview Tab — hide for faculty
  if (!isFaculty) {
    document.getElementById('quickAddStudentBtn')?.addEventListener('click', () => {
      window.switchAdminTab('tab-students');
      openAddStudentModal();
    });
    document.getElementById('quickAddNoteBtn')?.addEventListener('click', () => {
      window.switchAdminTab('tab-notes');
      openAddNoteModal();
    });
    document.getElementById('quickAddNoticeBtn')?.addEventListener('click', () => {
      window.switchAdminTab('tab-notices');
    });
  } else {
    // Faculty quick actions
    document.getElementById('quickAddNoteBtn')?.addEventListener('click', () => {
      window.switchAdminTab('tab-notes');
      openAddNoteModal();
    });
    document.getElementById('quickAddDoubtsBtn')?.addEventListener('click', () => {
      window.switchAdminTab('tab-doubts');
    });
  }

  // Setup Event Listeners
  if (!adminListenersInitialized) {
    setupEventListeners();
    adminListenersInitialized = true;
  }

  // Initial Load of all Data
  loadAllAdminData();
  // Auto-switch to default tab for faculty
  if (isFaculty) {
    window.switchAdminTab('tab-notes');
  }
}

// Refresh functions for individual tabs
function refreshActiveTabData(tabId) {
  try {
    if (tabId === 'tab-overview') renderOverviewStats();
    if (tabId === 'tab-students') renderStudentsTable();
    if (tabId === 'tab-notes') renderNotesTable();
    if (tabId === 'tab-papers') renderPapersTable();
    if (tabId === 'tab-notices') renderNoticesManager();
    if (tabId === 'tab-inquiries') renderInquiriesTable();
    if (tabId === 'tab-tests') renderTestsTable();
    if (tabId === 'tab-attendance') renderAttendanceTable();
    if (tabId === 'tab-doubts') renderDoubtsManager();
    if (tabId === 'tab-fees') renderReceiptsTable();
    if (tabId === 'tab-timetable') renderTimetableManager();
    if (tabId === 'tab-toppers') renderToppersManager();
    if (tabId === 'tab-whatsapp') renderWhatsAppStudentOptions();
  } catch (err) {
    console.error('Error refreshing tab ' + tabId + ':', err);
  }
}

function loadAllAdminData() {
  const fns = [
    renderOverviewStats,
    renderStudentsTable,
    renderNotesTable,
    renderPapersTable,
    renderNoticesManager,
    renderInquiriesTable,
    renderTestsTable,
    renderAttendanceTable,
    renderDoubtsManager,
    renderReceiptsTable,
    renderTimetableManager,
    renderToppersManager,
    renderWhatsAppStudentOptions
  ];
  fns.forEach(fn => {
    try {
      if (typeof fn === 'function') fn();
    } catch (e) {
      console.error('Error in ' + (fn.name || 'render function') + ':', e);
    }
  });
}

// -------------------------------------------------------------
// 1. OVERVIEW STATS & PREVIEWS
// -------------------------------------------------------------
function renderOverviewStats() {
  const students = AcademyDB.getStudents();
  const notes = AcademyDB.getNotes();
  const notices = AcademyDB.getNotices();
  const inquiries = AcademyDB.getInquiries();
  const timetable = AcademyDB.getTimetable() || [];

  const totalStuEl = document.getElementById('statTotalStudents');
  if (totalStuEl) totalStuEl.textContent = students.length;

  const totalNotesEl = document.getElementById('statTotalNotes');
  if (totalNotesEl) totalNotesEl.textContent = notes.length;

  const statBatchesEl = document.getElementById('statTotalBatches');
  if (statBatchesEl) statBatchesEl.textContent = timetable.length;

  const totalNoticesEl = document.getElementById('statTotalNotices');
  if (totalNoticesEl) totalNoticesEl.textContent = notices.length;

  const totalInqEl = document.getElementById('statTotalInquiries');
  if (totalInqEl) totalInqEl.textContent = inquiries.filter(i => i.status !== 'Admitted').length;

  // Overview Inquiries Table (Latest 4)
  const tbody = document.getElementById('overviewInquiriesTable');
  if (tbody) {
    const recentInquiries = [...inquiries].reverse().slice(0, 4);
    tbody.innerHTML = recentInquiries.map(inq => `
      <tr>
        <td><strong>${inq.name}</strong><br><small>${inq.phone}</small></td>
        <td><span class="badge ${inq.type.includes('Demo') ? 'badge-demo' : 'badge-regular'}">${inq.type}</span></td>
        <td>${inq.standard}</td>
        <td><span class="badge badge-status-${inq.status.toLowerCase()}">${inq.status}</span></td>
      </tr>
    `).join('');
  }

  // Overview Notices List (Latest 3)
  const noticesContainer = document.getElementById('overviewNoticesList');
  if (noticesContainer) {
    const recentNotices = [...notices].reverse().slice(0, 3);
    noticesContainer.innerHTML = recentNotices.map(n => `
      <div class="overview-notice-item">
        <div class="notice-meta-row">
          <span class="badge badge-category">${n.category}</span>
          <small>📅 ${n.date}</small>
        </div>
        <h4>${n.title}</h4>
        <p>${n.content.substring(0, 120)}...</p>
      </div>
    `).join('');
  }
}

// -------------------------------------------------------------
// 2. STUDENTS MANAGEMENT
// -------------------------------------------------------------
function renderStudentsTable() {
  const students = AcademyDB.getStudents() || [];
  const search = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
  const standardFilter = document.getElementById('studentStandardFilter')?.value || 'all';
  const feeFilter = document.getElementById('studentFeeFilter')?.value || 'all';

  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filtered = students.filter(s => {
    if (!s) return false;
    const name = (s.name || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    const phone = s.phone || '';
    const parent = (s.parentName || '').toLowerCase();
    const std = s.standard || '';

    const matchSearch = !search ||
      name.includes(search) ||
      id.includes(search) ||
      phone.includes(search) ||
      parent.includes(search);

    const matchStandard = standardFilter === 'all' || std.includes(standardFilter) || std === standardFilter;
    const matchFee = feeFilter === 'all' || s.feeStatus === feeFilter;

    return matchSearch && matchStandard && matchFee;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No students found matching your filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><code>${s.id}</code></td>
      <td><strong>${s.name}</strong><br><small>PIN: ${s.pin}</small></td>
      <td><span class="badge badge-standard">${s.standard}</span></td>
      <td><a href="tel:${s.phone}">📞 ${s.phone}</a></td>
      <td>${s.parentName || '—'}<br><small>${s.parentPhone ? '📞 ' + s.parentPhone : ''}</small></td>
      <td>
        <button class="btn-toggle-fee ${s.feeStatus === 'Paid' ? 'fee-paid' : 'fee-pending'}" onclick="toggleStudentFee('${s.id}')">
          ${s.feeStatus === 'Paid' ? '✅ Paid' : '⏳ Pending'}
        </button>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-sm btn-edit" onclick="openEditStudentModal('${s.id}')" title="Edit Student">✏️</button>
          <button class="btn-sm btn-delete" onclick="deleteStudent('${s.id}')" title="Delete Student">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddStudentModal = function() {
  const title = document.getElementById('studentModalTitle');
  if (title) title.textContent = 'Add New Enrolled Student';
  const idInput = document.getElementById('modalStudentId');
  if (idInput) idInput.value = '';
  const nameInput = document.getElementById('modalStudentName');
  if (nameInput) nameInput.value = '';
  const stdInput = document.getElementById('modalStudentStandard');
  if (stdInput) stdInput.value = 'Standard 10 (SSC)';
  const phoneInput = document.getElementById('modalStudentPhone');
  if (phoneInput) phoneInput.value = '';
  const pinInput = document.getElementById('modalStudentPin');
  if (pinInput) pinInput.value = 'student123';
  const parentNameInput = document.getElementById('modalParentName');
  if (parentNameInput) parentNameInput.value = '';
  const parentPhoneInput = document.getElementById('modalParentPhone');
  if (parentPhoneInput) parentPhoneInput.value = '';
  const feeStatusInput = document.getElementById('modalFeeStatus');
  if (feeStatusInput) feeStatusInput.value = 'Paid';

  const modal = document.getElementById('studentModal');
  if (modal) modal.style.display = 'flex';
};

window.triggerStudentCsvImport = function() {
  const input = document.getElementById('importStudentsCsvInput');
  if (input) input.click();
};

window.handleStudentCsvUpload = function(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const text = evt.target?.result;
      if (typeof text !== 'string' || !text.trim()) {
        alert('⚠️ The selected CSV file is empty.');
        return;
      }
      importStudentsFromCSV(text);
    } catch (err) {
      alert('❌ Error parsing CSV file: ' + (err.message || 'Unknown error'));
    } finally {
      const input = document.getElementById('importStudentsCsvInput');
      if (input) input.value = '';
    }
  };
  reader.onerror = () => {
    alert('❌ Error reading file. Please try again.');
    const input = document.getElementById('importStudentsCsvInput');
    if (input) input.value = '';
  };
  reader.readAsText(file);
};

window.exportStudentsToCsv = function() {
  const students = AcademyDB.getStudents() || [];
  let csv = 'Student ID,Name,Standard,Phone,PIN,Parent Name,Parent Phone,Fee Status,Enrolled Date\n';
  students.forEach(s => {
    csv += `"${s.id || ''}","${s.name || ''}","${s.standard || ''}","${s.phone || ''}","${s.pin || ''}","${s.parentName || ''}","${s.parentPhone || ''}","${s.feeStatus || 'Paid'}","${s.enrolledDate || ''}"\n`;
  });
  downloadFile(csv, 'academy_students.csv', 'text/csv');
};

window.openEditStudentModal = function(studentId) {
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('studentModalTitle').textContent = 'Edit Student Details';
  document.getElementById('modalStudentId').value = student.id;
  document.getElementById('modalStudentName').value = student.name;
  document.getElementById('modalStudentStandard').value = student.standard;
  document.getElementById('modalStudentPhone').value = student.phone;
  document.getElementById('modalStudentPin').value = student.pin || 'student123';
  document.getElementById('modalParentName').value = student.parentName || '';
  document.getElementById('modalParentPhone').value = student.parentPhone || '';
  document.getElementById('modalFeeStatus').value = student.feeStatus || 'Paid';
  document.getElementById('modalMonthlyFee').value = student.monthlyFee || 0;

  document.getElementById('studentModal').style.display = 'flex';
};

window.closeStudentModal = function() {
  document.getElementById('studentModal').style.display = 'none';
};

window.toggleStudentFee = function(studentId) {
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === studentId);
  if (student) {
    student.feeStatus = student.feeStatus === 'Paid' ? 'Pending' : 'Paid';
    AcademyDB.saveStudents(students);
    renderStudentsTable();
    renderOverviewStats();
  }
};

window.deleteStudent = function(studentId) {
  if (confirm(`Are you sure you want to remove student ID ${studentId}? This action cannot be undone.`)) {
    let students = AcademyDB.getStudents();
    students = students.filter(s => s.id !== studentId);
    AcademyDB.saveStudents(students);

    // Also drop attendance records for the removed student so the
    // tracker stays in sync with the student list.
    const attendance = AcademyDB.getAttendance() || [];
    const remaining = attendance.filter(a => a.studentId !== studentId);
    AcademyDB.saveAttendance(remaining);

    renderStudentsTable();
    renderAttendanceTable();
    renderOverviewStats();
    renderWhatsAppStudentOptions();
  }
};

// Re-sequence all student IDs sequentially from STU-1001
// Updates student records AND any linked data (attendance, test results, receipts, etc.)
window.resequenceStudentIds = function() {
  const students = AcademyDB.getStudents();
  if (!students || students.length === 0) {
    alert('No students to re-sequence.');
    return;
  }

  if (!confirm('⚠️ This will re-assign ALL student IDs sequentially from STU-1001.\n\nLinked data (attendance, test marks, fee receipts, WhatsApp alerts) will be updated to match the new IDs.\n\nProceed?')) {
    return;
  }

  // Build mapping: oldId -> newId
  const idMap = {};
  students.forEach((s, i) => {
    idMap[s.id] = 'STU-' + (1001 + i);
  });

  // 1. Update student records
  students.forEach((s, i) => {
    s.id = 'STU-' + (1001 + i);
  });
  AcademyDB.saveStudents(students);

  // 2. Update attendance records
  const attendance = AcademyDB.getAttendance() || [];
  attendance.forEach(a => {
    if (idMap[a.studentId]) a.studentId = idMap[a.studentId];
  });
  AcademyDB.saveAttendance(attendance);

  // 3. Update test results
  const tests = AcademyDB.getTestResults() || [];
  tests.forEach(t => {
    if (idMap[t.studentId]) t.studentId = idMap[t.studentId];
  });
  AcademyDB.saveTestResults(tests);

  // 4. Update fee receipts
  const receipts = AcademyDB.getReceipts() || [];
  receipts.forEach(r => {
    if (idMap[r.studentId]) r.studentId = idMap[r.studentId];
  });
  AcademyDB.saveReceipts(receipts);

  // 5. Update WhatsApp alert logs (if any)
  const whatsappLogs = AcademyDB.getWhatsAppLogs?.() || [];
  whatsappLogs.forEach(l => {
    if (idMap[l.studentId]) l.studentId = idMap[l.studentId];
  });
  if (AcademyDB.saveWhatsAppLogs) AcademyDB.saveWhatsAppLogs(whatsappLogs);

  // Refresh all views
  renderStudentsTable();
  renderAttendanceTable();
  renderTestsTable();
  renderReceiptsTable();
  renderOverviewStats();
  renderWhatsAppStudentOptions();

  alert(`✅ Re-sequenced ${students.length} student(s) from STU-1001 to STU-${1000 + students.length}!\n\nAll linked data (attendance, tests, receipts) updated.`);
};

// Document upload state variables
let uploadedNoteFileData = null;
let uploadedNoteFileName = '';
let uploadedNoteFileType = 'PDF';

let uploadedPaperFileData = null;
let uploadedPaperFileName = '';
let uploadedPaperFileType = 'PDF';

// Topper photo state variables
let uploadedTopperPhotoData = null;
let uploadedTopperPhotoName = '';
let uploadedTopperPhotoType = 'JPG';

let uploadedSolutionFileData = null;
let uploadedSolutionFileName = '';

// Helper to format file sizes
function formatByteSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// -------------------------------------------------------------
// 3. NOTES MANAGEMENT
// -------------------------------------------------------------
function renderNotesTable() {
  const notes = AcademyDB.getNotes();
  const search = (document.getElementById('noteSearchInput')?.value || '').toLowerCase().trim();
  const standardFilter = document.getElementById('noteStandardFilter')?.value || 'all';

  const tbody = document.getElementById('notesTableBody');
  if (!tbody) return;

  const filtered = notes.filter(n => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search) ||
      n.subject.toLowerCase().includes(search) ||
      n.chapter.toLowerCase().includes(search);

    const matchStandard = standardFilter === 'all' || n.standard === standardFilter;
    return matchSearch && matchStandard;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No study notes found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(n => `
    <tr>
      <td><strong>${n.title}</strong><br><small>${(n.description || '').substring(0, 75)}...</small></td>
      <td><span class="badge badge-standard">${n.standard}</span></td>
      <td>${n.subject}</td>
      <td>${n.chapter}</td>
      <td><span class="badge badge-category">📄 ${n.fileType || 'PDF'}</span> <code style="font-size:0.8rem;margin-left:4px;">${n.size || '2.0 MB'}</code></td>
      <td>${n.date || '—'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-sm btn-download" onclick="downloadAdminNote('${n.id}')" title="Download Document">⬇️ Download</button>
          <button class="btn-sm btn-edit" onclick="previewNoteContent('${n.id}')" title="Preview Note Details">👁️</button>
          <button class="btn-sm btn-delete" onclick="deleteNote('${n.id}')" title="Delete Note">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.downloadAdminNote = function(noteId) {
  const notes = AcademyDB.getNotes();
  const note = notes.find(n => n.id === noteId);
  if (note && typeof window.downloadDocumentFile === 'function') {
    window.downloadDocumentFile(note, note.title, 'note');
  }
};

window.openAddNoteModal = function() {
  const form = document.getElementById('noteModalForm');
  if (form) form.reset();
  uploadedNoteFileData = null;
  uploadedNoteFileName = '';
  uploadedNoteFileType = 'PDF';
  const preview = document.getElementById('noteFileSelectedPreview');
  if (preview) preview.style.display = 'none';
  const fileInput = document.getElementById('modalNoteFile');
  if (fileInput) fileInput.value = '';
  document.getElementById('noteModal').style.display = 'flex';
};

window.closeNoteModal = function() {
  document.getElementById('noteModal').style.display = 'none';
};

window.deleteNote = function(noteId) {
  if (confirm('Are you sure you want to remove this study note document?')) {
    let notes = AcademyDB.getNotes();
    notes = notes.filter(n => n.id !== noteId);
    AcademyDB.saveNotes(notes);
    renderNotesTable();
    renderOverviewStats();
  }
};

window.previewNoteContent = function(noteId) {
  const notes = AcademyDB.getNotes();
  const note = notes.find(n => n.id === noteId);
  if (note) {
    alert(`📖 Study Note Details:\n\nTitle: ${note.title}\nStandard: ${note.standard}\nSubject: ${note.subject}\nChapter: ${note.chapter}\nSize: ${note.size}\nFormat: ${note.fileType || 'PDF'}\n\nSummary:\n${note.description}`);
  }
};

// -------------------------------------------------------------
// 3B. BOARD QUESTION PAPERS & PYQS MANAGEMENT
// -------------------------------------------------------------
function renderPapersTable() {
  const papers = AcademyDB.getPapers() || [];
  const search = (document.getElementById('paperSearchInput')?.value || '').toLowerCase().trim();
  const standardFilter = document.getElementById('paperStandardFilter')?.value || 'all';
  const typeFilter = document.getElementById('paperTypeFilter')?.value || 'all';

  const tbody = document.getElementById('papersTableBody');
  if (!tbody) return;

  const filtered = papers.filter(p => {
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search) ||
      p.subject.toLowerCase().includes(search) ||
      (p.year && p.year.toLowerCase().includes(search)) ||
      (p.description && p.description.toLowerCase().includes(search));

    const matchStandard = standardFilter === 'all' || p.standard === standardFilter;
    const matchType = typeFilter === 'all' || p.type === typeFilter;

    return matchSearch && matchStandard && matchType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No board question papers found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let typeBadge = 'badge-pyq';
    if (p.type === 'SCERT Question Bank') typeBadge = 'badge-bank';
    if (p.type === 'Model Paper') typeBadge = 'badge-model';

    // Enrollment badge
    let accessBadge = '';
    if (p.isSamplePaper) {
      accessBadge = '<span class="badge" style="background:#dcfce7;color:#166534;margin-top:4px;display:inline-block;">🌟 Free Sample</span>';
    } else if (p.enrollmentRequired) {
      accessBadge = '<span class="badge" style="background:#fee2e2;color:#991b1b;margin-top:4px;display:inline-block;">🔒 Enrolled Only</span>';
    } else {
      accessBadge = '<span class="badge badge-regular" style="margin-top:4px;display:inline-block;">🌐 Public</span>';
    }

    return `
      <tr>
        <td><strong>${p.title}</strong><br><small style="color:var(--text-muted);">${p.subject}</small></td>
        <td><span class="badge badge-standard">${p.standard}</span></td>
        <td><strong>${p.year || 'Board Paper'}</strong></td>
        <td><span class="paper-type-pill ${typeBadge}">📝 ${p.type}</span></td>
        <td>${p.marks || '40 Marks'}</td>
        <td>
          <span class="badge badge-category">📄 ${p.fileType || 'PDF'}</span><br>
          <span class="badge ${p.solutionAvailable ? 'badge-paid' : 'badge-regular'}" style="margin-top:4px;display:inline-block;">${p.solutionAvailable ? '🔑 Key Attached' : '⏳ Solution Pending'}</span><br>
          ${accessBadge}
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-sm btn-download" onclick="downloadAdminPaper('${p.id}')" title="Download Question Paper">⬇️ Paper</button>
            ${p.solutionAvailable ? `<button class="btn-sm btn-solution" onclick="downloadAdminSolution('${p.id}')" title="Download Answer Key">🔑 Key</button>` : ''}
            <button class="btn-sm btn-edit" onclick="previewPaperDetails('${p.id}')" title="Preview Details">👁️</button>
            <button class="btn-sm btn-delete" onclick="deletePaper('${p.id}')" title="Delete Paper">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.downloadAdminPaper = function(paperId) {
  const papers = AcademyDB.getPapers() || [];
  const paper = papers.find(p => p.id === paperId);
  if (paper && typeof window.downloadDocumentFile === 'function') {
    window.downloadDocumentFile(paper, paper.title, 'paper');
  }
};

window.downloadAdminSolution = function(paperId) {
  const papers = AcademyDB.getPapers() || [];
  const paper = papers.find(p => p.id === paperId);
  if (paper && typeof window.downloadDocumentFile === 'function') {
    window.downloadDocumentFile(paper, paper.title, 'solution');
  }
};

window.openAddPaperModal = function() {
  const form = document.getElementById('paperModalForm');
  if (form) form.reset();
  uploadedPaperFileData = null;
  uploadedPaperFileName = '';
  uploadedPaperFileType = 'PDF';
  uploadedSolutionFileData = null;
  uploadedSolutionFileName = '';
  const paperPreview = document.getElementById('paperFileSelectedPreview');
  if (paperPreview) paperPreview.style.display = 'none';
  const solPreview = document.getElementById('paperSolutionSelectedPreview');
  if (solPreview) solPreview.style.display = 'none';
  const paperFile = document.getElementById('modalPaperFile');
  if (paperFile) paperFile.value = '';
  const solFile = document.getElementById('modalPaperSolutionFile');
  if (solFile) solFile.value = '';
  document.getElementById('paperModal').style.display = 'flex';
};

window.closePaperModal = function() {
  document.getElementById('paperModal').style.display = 'none';
};

window.deletePaper = function(paperId) {
  if (confirm('Are you sure you want to remove this board question paper?')) {
    let papers = AcademyDB.getPapers() || [];
    papers = papers.filter(p => p.id !== paperId);
    AcademyDB.savePapers(papers);
    renderPapersTable();
    renderOverviewStats();
  }
};

window.previewPaperDetails = function(paperId) {
  const papers = AcademyDB.getPapers() || [];
  const paper = papers.find(p => p.id === paperId);
  if (paper) {
    alert(`📝 Board Question Paper Overview:\n\nTitle: ${paper.title}\nStandard: ${paper.standard}\nSubject: ${paper.subject}\nYear/Session: ${paper.year}\nCategory: ${paper.type}\nMarks: ${paper.marks}\nDuration: ${paper.duration}\nFormat: ${paper.fileType || 'PDF'}\nSolution Included: ${paper.solutionAvailable ? 'Yes' : 'No'}\n\nDescription:\n${paper.description}`);
  }
};

// -------------------------------------------------------------
// 4. NOTICE BOARD
// -------------------------------------------------------------
function renderNoticesManager() {
  const notices = AcademyDB.getNotices();
  const container = document.getElementById('activeNoticesManagerList');
  if (!container) return;

  if (notices.length === 0) {
    container.innerHTML = `<p class="text-center">No active announcements. Post a notice to notify students.</p>`;
    return;
  }

  container.innerHTML = [...notices].reverse().map(n => `
    <div class="manager-notice-card">
      <div class="notice-meta-row">
        <span class="badge badge-category">${n.category}</span>
        <small>📅 Published: ${n.date}</small>
        <button class="btn-sm btn-delete" onclick="deleteNotice('${n.id}')" title="Delete Notice">🗑️ Delete</button>
      </div>
      <h4>${n.title}</h4>
      <p>${n.content}</p>
    </div>
  `).join('');
}

window.deleteNotice = function(noticeId) {
  if (confirm('Delete this announcement? It will no longer appear on student dashboards.')) {
    let notices = AcademyDB.getNotices();
    notices = notices.filter(n => n.id !== noticeId);
    AcademyDB.saveNotices(notices);
    renderNoticesManager();
    renderOverviewStats();
  }
};

// -------------------------------------------------------------
// 5. INQUIRIES & DEMO LEADS
// -------------------------------------------------------------
function renderInquiriesTable() {
  const inquiries = AcademyDB.getInquiries();
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No student inquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = [...inquiries].reverse().map(inq => {
    const cleanPhone = (inq.phone || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(inq.name)}%2C%20greetings%20from%20Nikhillesh%20Bhatkar%20Learning%20Academy%20regarding%20your%20inquiry.`;
    return `
      <tr>
        <td><small>${inq.date}</small></td>
        <td><strong>${inq.name}</strong></td>
        <td><a href="tel:${inq.phone}">📞 ${inq.phone}</a></td>
        <td><small>${inq.email || '—'}</small></td>
        <td><span class="badge badge-standard">${inq.standard}</span></td>
        <td><span class="badge ${inq.type.includes('Demo') ? 'badge-demo' : 'badge-regular'}">${inq.type}</span></td>
        <td>
          <select class="status-select" onchange="updateInquiryStatus('${inq.id}', this.value)">
            <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Admitted" ${inq.status === 'Admitted' ? 'selected' : ''}>Admitted</option>
          </select>
        </td>
        <td>
          <div class="action-buttons">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-sm btn-wa" title="Chat on WhatsApp">💬 WhatsApp</a>
            <button class="btn-sm btn-delete" onclick="deleteInquiry('${inq.id}')" title="Delete Inquiry">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.updateInquiryStatus = function(inquiryId, newStatus) {
  const inquiries = AcademyDB.getInquiries();
  const inq = inquiries.find(i => i.id === inquiryId);
  if (inq) {
    inq.status = newStatus;
    AcademyDB.saveInquiries(inquiries);
    renderOverviewStats();
  }
};

window.deleteInquiry = function(inquiryId) {
  if (confirm('Delete this inquiry record?')) {
    let inquiries = AcademyDB.getInquiries();
    inquiries = inquiries.filter(i => i.id !== inquiryId);
    AcademyDB.saveInquiries(inquiries);
    renderInquiriesTable();
    renderOverviewStats();
  }
};

// -------------------------------------------------------------
// 7. TEST MARKS & REPORT CARDS
// -------------------------------------------------------------
function renderTestsTable() {
  const tests = AcademyDB.getTestResults() || [];
  const search = (document.getElementById('testSearchInput')?.value || '').toLowerCase().trim();
  const standardFilter = document.getElementById('testStandardFilter')?.value || 'all';

  const tbody = document.getElementById('testsTableBody');
  if (!tbody) return;

  const filtered = tests.filter(t => {
    const matchSearch = !search ||
      (t.studentName && t.studentName.toLowerCase().includes(search)) ||
      (t.testTitle && t.testTitle.toLowerCase().includes(search)) ||
      (t.subject && t.subject.toLowerCase().includes(search));

    const matchStandard = standardFilter === 'all' || (t.standard && t.standard.includes(standardFilter));
    return matchSearch && matchStandard;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No test records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const percent = Math.round((t.marksObtained / t.totalMarks) * 100);
    return `
      <tr>
        <td><strong>${t.studentName}</strong><br><small>${t.studentId}</small></td>
        <td><span class="badge badge-standard">${t.standard}</span></td>
        <td><strong>${t.testTitle}</strong></td>
        <td>${t.subject}</td>
        <td><small>${t.date}</small></td>
        <td><strong>${t.marksObtained}</strong> / ${t.totalMarks} <small>(${percent}%)</small></td>
        <td><span class="badge ${percent >= 80 ? 'badge-paid' : 'badge-regular'}">${t.grade || 'A'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-sm btn-edit" onclick="printStudentReportCard('${t.studentId}')" title="Print Report Card">🖨️ Report</button>
            <button class="btn-sm btn-delete" onclick="deleteTestResult('${t.id}')" title="Delete Test">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAddTestModal = function() {
  const students = AcademyDB.getStudents();
  const studentSelect = document.getElementById('modalTestStudent');
  if (studentSelect) {
    studentSelect.innerHTML = students.map(s => `
      <option value="${s.id}|${s.name}|${s.standard}">${s.name} (${s.standard} - ${s.id})</option>
    `).join('');
  }
  const dateInput = document.getElementById('modalTestDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  document.getElementById('testModal').style.display = 'flex';
};

window.openStandardTestModal = function() {
  const stdSelect = document.getElementById('stdSelect');
  if (stdSelect) {
    stdSelect.innerHTML = `
      <option value="">Select Standard</option>
      <option value="Standard 8">Standard 8</option>
      <option value="Standard 9">Standard 9</option>
      <option value="Standard 10 (SSC)">Standard 10 (SSC)</option>
      <option value="Standard 12 (HSC)">Standard 12 (HSC)</option>
    `;
  }
  // Reset form fields
  document.getElementById('examTitle').value = '';
  document.getElementById('examSubject').value = '';
  document.getElementById('examDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('examTotal').value = '';
  document.getElementById('examPass').value = '';
  document.getElementById('stdMarksBody').innerHTML = '';
  // Show step 1
  document.getElementById('stdStep1').style.display = '';
  document.getElementById('stdStep2').style.display = 'none';
  document.getElementById('standardTestModal').style.display = 'flex';
};

// Step 1 -> Step 2: build the per-student marks table
window.stdStepNext = function() {
  const std = document.getElementById('stdSelect').value;
  const examTitle = document.getElementById('examTitle').value.trim();
  const examSubject = document.getElementById('examSubject').value.trim();
  const examTotal = Number(document.getElementById('examTotal').value);

  if (!std) { alert('⚠️ Please select a standard first.'); return; }
  if (!examTitle) { alert('⚠️ Please enter the test / exam title.'); return; }
  if (!examSubject) { alert('⚠️ Please enter the subject.'); return; }
  if (!examTotal || examTotal <= 0) { alert('⚠️ Please enter valid total marks.'); return; }

  const students = (AcademyDB.getStudents() || []).filter(s => s.standard === std);
  const tbody = document.getElementById('stdMarksBody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No students enrolled for ${std} yet.</td></tr>`;
  } else {
    tbody.innerHTML = students.map((s, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td><strong>${s.name}</strong> <small style="color:#64748b;">(${s.id})</small></td>
        <td>
          <input type="number" id="stdMarks-${s.id}" min="0" max="${examTotal}" value=""
            style="width:90px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;" placeholder="0">
        </td>
        <td>
          <input type="text" id="stdRemarks-${s.id}" value=""
            style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;" placeholder="Optional remarks">
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('stdStep2Summary').innerHTML =
    `📌 <strong>${examTitle}</strong> · ${examSubject} · ${std} · Total: ${examTotal} marks` +
    (document.getElementById('examPass').value ? ` · Passing: ${document.getElementById('examPass').value}` : '') +
    ` · ${students.length} student(s)`;

  document.getElementById('stdStep1').style.display = 'none';
  document.getElementById('stdStep2').style.display = '';
};

// Step 2 -> Step 1
window.stdStepBack = function() {
  document.getElementById('stdStep1').style.display = '';
  document.getElementById('stdStep2').style.display = 'none';
};

window.deleteTestResult = function(testId) {
  if (confirm('Delete this test result record?')) {
    let tests = AcademyDB.getTestResults() || [];
    tests = tests.filter(t => t.id !== testId);
    AcademyDB.saveTestResults(tests);
    renderTestsTable();
  }
};

window.printStudentReportCard = function(studentId) {
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const tests = (AcademyDB.getTestResults() || []).filter(t => t.studentId === studentId);
  const attendance = (AcademyDB.getAttendance() || []).find(a => a.studentId === studentId);

  let totalMax = 0;
  let totalScored = 0;
  tests.forEach(t => {
    totalMax += Number(t.totalMarks) || 0;
    totalScored += Number(t.marksObtained) || 0;
  });
  const overallPercent = totalMax > 0 ? Math.round((totalScored / totalMax) * 100) : 0;

  const printArea = document.getElementById('printReceiptContent');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="printable-report-card">
      <div class="receipt-header">
        <h2>🏛️ NIKHILLESH BHATKAR LEARNING ACADEMY</h2>
        <p>Near S.T. Stand, Sangameshwar, Dist. Ratnagiri — 415611</p>
        <p><strong>Contact:</strong> +91 83800 96494</p>
        <hr style="margin:12px 0;">
        <h3 style="text-transform:uppercase;letter-spacing:1px;color:#1e3c72;">Student Academic Progress &amp; Report Card</h3>
      </div>
      <div class="report-student-meta">
        <div class="meta-col">
          <p><strong>Student Name:</strong> ${student.name}</p>
          <p><strong>Student ID:</strong> ${student.id}</p>
          <p><strong>Standard / Class:</strong> ${student.standard}</p>
        </div>
        <div class="meta-col">
          <p><strong>Parent Name:</strong> ${student.parentName || 'Parent / Guardian'}</p>
          <p><strong>Attendance:</strong> ${attendance ? attendance.percentage + '%' : '95%'}</p>
          <p><strong>Issue Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>
      <table class="report-table-printable" style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f0f4f8;">
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">Exam / Test Name</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">Subject</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:center;">Date</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:center;">Max Marks</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:center;">Marks Scored</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:center;">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${tests.length > 0 ? tests.map(t => `
            <tr>
              <td style="border:1px solid #ccc;padding:8px;">${t.testTitle}</td>
              <td style="border:1px solid #ccc;padding:8px;">${t.subject}</td>
              <td style="border:1px solid #ccc;padding:8px;text-align:center;">${t.date}</td>
              <td style="border:1px solid #ccc;padding:8px;text-align:center;">${t.totalMarks}</td>
              <td style="border:1px solid #ccc;padding:8px;text-align:center;font-weight:bold;">${t.marksObtained}</td>
              <td style="border:1px solid #ccc;padding:8px;text-align:center;">${t.grade || 'A'}</td>
            </tr>
          `).join('') : `<tr><td colspan="6" style="border:1px solid #ccc;padding:8px;text-align:center;">No test records logged yet.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:#f8f9fa;font-weight:bold;">
            <td colspan="3" style="border:1px solid #ccc;padding:8px;text-align:right;">OVERALL AGGREGATE:</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${totalMax}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;color:#27ae60;">${totalScored} (${overallPercent}%)</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${overallPercent >= 85 ? 'Distinction' : 'First Class'}</td>
          </tr>
        </tfoot>
      </table>
      <div class="report-remarks-box" style="background:#fafafa;border:1px solid #ddd;padding:12px;border-radius:6px;margin-top:10px;">
        <p><strong>Faculty Remarks:</strong> Sincere, punctual student. Shows strong analytical ability and consistent performance in weekly tests.</p>
      </div>
      <div class="receipt-signatures" style="display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px dashed #ccc;">
        <div>___________________<br>Parent's Signature</div>
        <div style="text-align:right;">___________________<br><strong>Nikhillesh Bhatkar</strong><br><small>Founder &amp; Head Educator</small></div>
      </div>
    </div>
  `;

  document.getElementById('printReceiptModal').style.display = 'flex';
};

// -------------------------------------------------------------
// FEE RECEIPT HELPERS
// -------------------------------------------------------------

// Shared fee-balance calculation with safety guards.
// Prevents absurd "lakh" balances caused by a bad enrollment date
// or a monthly fee that was accidentally entered as an annual amount.
function computeFeeBalance(monthlyFee, enrolledDate, totalPaid) {
  const fee = Number(monthlyFee) || 0;
  const paid = Number(totalPaid) || 0;

  // No fee recorded -> nothing is owed
  if (fee <= 0) {
    return { monthsEnrolled: 0, totalExpected: 0, balance: 0 };
  }

  const now = new Date();
  const enrolled = enrolledDate ? new Date(enrolledDate) : now;
  let months = (now.getFullYear() - enrolled.getFullYear()) * 12
              + (now.getMonth() - enrolled.getMonth()) + 1;

  // Guard against NaN / negative / absurd values
  if (!isFinite(months) || months < 0) months = 0;
  if (months > 60) months = 60; // hard cap of 5 years

  const totalExpected = fee * months;
  const balance = totalExpected - paid;

  return {
    monthsEnrolled: months,
    totalExpected: totalExpected,
    balance: Math.max(0, balance) // never show a negative "pending"
  };
}

window.updateReceiptStudentInfo = function() {
  const select = document.getElementById('modalReceiptStudent');
  if (!select || !select.value) return;

  const [studentId, studentName, parentName, standard] = select.value.split('|');
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === studentId);
  const receipts = AcademyDB.getReceipts() || [];

  if (!student) return;

  const studentReceipts = receipts.filter(r => r.studentId === studentId);
  const totalPaid = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const monthlyFee = student.monthlyFee || 0;

  // Calculate months enrolled (safely — guards against bad enrollment dates)
  const enrolledDate = student.enrolledDate ? new Date(student.enrolledDate) : new Date();
  const { monthsEnrolled, totalExpected, balance } = computeFeeBalance(monthlyFee, enrolledDate, totalPaid);

  // Populate period dropdown
  const periodSelect = document.getElementById('modalReceiptPeriod');
  if (periodSelect) {
    periodSelect.innerHTML = '<option value="">Select Month</option>';
    // Generate months from enrollment to current
    const startYear = enrolledDate.getFullYear();
    const startMonth = enrolledDate.getMonth();
    const endDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let y = startYear; y <= endDate.getFullYear(); y++) {
      const mStart = (y === startYear) ? startMonth : 0;
      const mEnd = (y === endDate.getFullYear()) ? endDate.getMonth() : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const value = y + '-' + String(m + 1).padStart(2, '0'); // YYYY-MM
        const label = monthNames[m] + ' ' + y;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        // Pre-select current month if not already paid
        const alreadyPaid = studentReceipts.some(r => r.period === value);
        if (!alreadyPaid && y === endDate.getFullYear() && m === endDate.getMonth()) {
          option.selected = true;
        }
        periodSelect.appendChild(option);
      }
    }
  }

  // Update display
  document.getElementById('rcptMonthlyFee').textContent = '₹' + monthlyFee.toLocaleString('en-IN');
  document.getElementById('rcptTotalPaid').textContent = '₹' + totalPaid.toLocaleString('en-IN');
  document.getElementById('rcptTotalExpected').textContent = '₹' + totalExpected.toLocaleString('en-IN');
  document.getElementById('rcptBalance').textContent = '₹' + balance.toLocaleString('en-IN');
  document.getElementById('rcptSuggestedAmount').textContent = '₹' + monthlyFee.toLocaleString('en-IN');

  // Show/hide info box
  document.getElementById('receiptStudentInfo').style.display = monthlyFee > 0 ? 'block' : 'none';
};

window.printFeeReceipt = function(receipt) {
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === receipt.studentId);
  const studentReceipts = (AcademyDB.getReceipts() || []).filter(r => r.studentId === receipt.studentId);
  const totalPaid = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const monthlyFee = student?.monthlyFee || 0;
  const enrolledDate = student?.enrolledDate ? new Date(student.enrolledDate) : new Date();
  const { monthsEnrolled, totalExpected, balance } = computeFeeBalance(monthlyFee, enrolledDate, totalPaid);

  // Format period for display
  const periodDate = new Date(receipt.period + '-01');
  const periodLabel = periodDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const printArea = document.getElementById('printReceiptContent');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="printable-receipt" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
      <!-- Header -->
      <div style="text-align:center;border-bottom:2px solid #1e3c72;padding-bottom:15px;margin-bottom:15px;">
        <h2 style="margin:0;color:#1e3c72;font-size:1.5rem;">🏛️ NIKHILLESH BHATKAR LEARNING ACADEMY</h2>
        <p style="margin:4px 0 0;color:#555;font-size:0.85rem;">Near S.T. Stand, Sangameshwar, Dist. Ratnagiri — 415611</p>
        <p style="margin:2px 0 0;color:#555;font-size:0.8rem;">Contact: +91 83800 96494</p>
        <hr style="margin:10px 0;border-color:#1e3c72;">
        <h3 style="margin:0;text-transform:uppercase;letter-spacing:1px;color:#1e3c72;font-size:1rem;">Fee Receipt</h3>
      </div>

      <!-- Receipt Info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;margin-bottom:15px;">
        <div><strong>Receipt No:</strong> ${receipt.receiptNo}</div>
        <div style="text-align:right;"><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString('en-IN')}</div>
        <div><strong>Period:</strong> ${periodLabel}</div>
        <div style="text-align:right;"><strong>Mode:</strong> ${receipt.paymentMode}</div>
        ${receipt.transactionId ? `<div><strong>Ref:</strong> ${receipt.transactionId}</div>` : ''}
        <div style="text-align:right;"><strong>Collected By:</strong> ${receipt.collectedBy}</div>
      </div>

      <!-- Student Info -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:15px;">
        <div style="font-weight:bold;color:#1e3c72;margin-bottom:8px;">👨‍🎓 Student Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.85rem;">
          <div><strong>Name:</strong> ${student?.name || receipt.studentName}</div>
          <div><strong>ID:</strong> ${receipt.studentId}</div>
          <div><strong>Standard:</strong> ${receipt.standard}</div>
          <div><strong>Parent:</strong> ${receipt.parentName}</div>
          <div><strong>Monthly Fee:</strong> ₹${monthlyFee.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <!-- Payment Details -->
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:15px;">
        <thead>
          <tr style="background:#1e3c72;color:white;">
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">Description</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:center;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">Fee for ${periodLabel}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;font-weight:bold;">${receipt.amount.toLocaleString('en-IN')}</td>
          </tr>
          ${receipt.remarks ? `<tr><td style="border:1px solid #ccc;padding:8px;font-size:0.8rem;">Remarks: ${receipt.remarks}</td><td style="border:1px solid #ccc;padding:8px;"></td></tr>` : ''}
        </tbody>
        <tfoot>
          <tr style="background:#f0f4f8;font-weight:bold;">
            <td style="border:1px solid #ccc;padding:8px;text-align:right;">TOTAL PAID THIS RECEIPT:</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;color:#27ae60;">₹${receipt.amount.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Running Balance Summary -->
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:15px;">
        <div style="font-weight:bold;color:#0369a1;margin-bottom:8px;">📊 Fee Summary (Running Balance)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.85rem;">
          <div><strong>Monthly Fee:</strong></div><div style="text-align:right;">₹${monthlyFee.toLocaleString('en-IN')}</div>
          <div><strong>Months Enrolled:</strong></div><div style="text-align:right;">${monthsEnrolled}</div>
          <div><strong>Total Expected:</strong></div><div style="text-align:right;">₹${totalExpected.toLocaleString('en-IN')}</div>
          <div><strong>Total Paid (incl. this):</strong></div><div style="text-align:right;color:#27ae60;">₹${totalPaid.toLocaleString('en-IN')}</div>
          <div style="grid-column:1/-1;"><hr style="margin:8px 0;border-color:#bae6fd;"></div>
          <div style="font-weight:bold;"><strong>Balance Due:</strong></div>
          <div style="text-align:right;font-weight:bold;color:${balance > 0 ? '#dc2626' : '#27ae60'};">₹${balance.toLocaleString('en-IN')} ${balance > 0 ? '(Pending)' : '(Paid in Full)'}</div>
        </div>
      </div>

      ${receipt.remarks ? `
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px;margin-bottom:15px;font-size:0.8rem;">
        <strong>Remarks:</strong> ${receipt.remarks}
      </div>` : ''}

      <!-- Signatures -->
      <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:15px;border-top:1px dashed #ccc;font-size:0.8rem;">
        <div style="text-align:center;">
          <div style="border-top:1px solid #333;width:150px;margin:0 auto;"></div>
          <div style="margin-top:4px;">Parent / Guardian Signature</div>
        </div>
        <div style="text-align:center;">
          <div style="border-top:1px solid #333;width:150px;margin:0 auto;"></div>
          <div style="margin-top:4px;">Authorized Signatory<br><small>Nikhillesh Bhatkar Academy</small></div>
        </div>
      </div>

      <div style="text-align:center;margin-top:15px;font-size:0.7rem;color:#888;">
        This is a computer-generated receipt. No signature required for digital payments.
      </div>
    </div>
  `;

  document.getElementById('printReceiptModal').style.display = 'flex';
};
function renderAttendanceTable() {
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  // Drive the table from the Student Management list so every enrolled
  // student appears — even those who have no attendance record yet.
  const students = AcademyDB.getStudents() || [];
  const attendance = AcademyDB.getAttendance() || [];

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No students enrolled yet.</td></tr>`;
    return;
  }

  // Standard filter
  const filter = document.getElementById('attendanceStandardFilter')?.value || 'all';
  const filteredStudents = filter === 'all'
    ? students
    : students.filter(s => s.standard === filter);

  if (filteredStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No students found for ${filter}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredStudents.map(s => {
    const a = attendance.find(x => x.studentId === s.id);
    if (!a) {
      // No attendance record yet — show as not-yet-marked
      return `
        <tr>
          <td><code>${s.id}</code></td>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-standard">${s.standard}</span></td>
          <td>0</td>
          <td>0</td>
          <td><span class="badge badge-pending">0%</span></td>
          <td><small>—</small></td>
          <td>
            <button class="btn-toggle-fee fee-pending" onclick="toggleTodayAttendance('${s.id}')">❌ Absent</button>
          </td>
        </tr>`;
    }

    let pctBadge = 'badge-paid';
    if (a.percentage < 75) pctBadge = 'badge-pending';
    else if (a.percentage < 90) pctBadge = 'badge-regular';

    return `
      <tr>
        <td><code>${s.id}</code></td>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-standard">${s.standard}</span></td>
        <td>${a.totalLectures}</td>
        <td><strong>${a.attendedLectures}</strong></td>
        <td><span class="badge ${pctBadge}">${a.percentage}%</span></td>
        <td><small>${a.lastMarkedDate || '—'}</small></td>
        <td>
          <button class="btn-toggle-fee ${a.status === 'Present' ? 'fee-paid' : (a.status === 'Leave' ? 'fee-leave' : 'fee-pending')}" onclick="toggleTodayAttendance('${s.id}')">
            ${a.status === 'Present' ? '✅ Present' : (a.status === 'Leave' ? '🌙 Leave' : '❌ Absent')}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleTodayAttendance = function(studentId) {
  let attendance = AcademyDB.getAttendance() || [];
  const students = AcademyDB.getStudents() || [];
  const student = students.find(s => s.id === studentId);
  let record = attendance.find(a => a.studentId === studentId);

  // Auto-create an attendance record for students who have none yet
  if (!record && student) {
    record = {
      studentId: student.id,
      studentName: student.name,
      standard: student.standard,
      totalLectures: 0,
      attendedLectures: 0,
      percentage: 0,
      lastMarkedDate: null,
      status: 'Absent',
      leaveCount: 0,
      history: []
    };
    attendance.push(record);
  }
  if (!record) return;

  if (!record.leaveCount) record.leaveCount = 0;

  // Cycle: Present -> Absent -> Leave -> Present
  if (record.status === 'Present') {
    record.status = 'Absent';
    record.attendedLectures = Math.max(0, record.attendedLectures - 1);
  } else if (record.status === 'Leave') {
    record.status = 'Present';
    record.attendedLectures += 1;
    record.leaveCount = Math.max(0, record.leaveCount - 1);
  } else {
    // Absent -> Leave (excused, doesn't count against attendance)
    record.status = 'Leave';
    record.leaveCount += 1;
  }

  const effectiveTotal = Math.max(1, record.totalLectures - record.leaveCount);
  record.percentage = Math.round((record.attendedLectures / effectiveTotal) * 1000) / 10;
  record.lastMarkedDate = new Date().toISOString().split('T')[0];
  AcademyDB.saveAttendance(attendance);
  renderAttendanceTable();
};

window.openAttendanceModal = function() {
  const students = AcademyDB.getStudents();
  const container = document.getElementById('attendanceChecklistContainer');
  const dateInput = document.getElementById('attendanceDateInput');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  if (container) {
    container.innerHTML = students.map(s => {
      // Pre-fill from existing record if present
      const existing = (AcademyDB.getAttendance() || []).find(a => a.studentId === s.id);
      const currentStatus = (existing && (existing.status === 'Present' || existing.status === 'Absent' || existing.status === 'Leave')) ? existing.status : 'Present';
      return `
      <div class="attendance-check-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
        <div>
          <strong>${s.name}</strong> <small>(${s.standard})</small>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <select class="att-status" data-id="${s.id}" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.85rem;">
            <option value="Present" ${currentStatus === 'Present' ? 'selected' : ''}>✅ Present</option>
            <option value="Absent" ${currentStatus === 'Absent' ? 'selected' : ''}>❌ Absent</option>
            <option value="Leave" ${currentStatus === 'Leave' ? 'selected' : ''}>🌙 Leave</option>
          </select>
        </label>
      </div>`;
    }).join('');
  }

  document.getElementById('attendanceModal').style.display = 'flex';
};

// -------------------------------------------------------------
// 9. STUDENT DOUBTS & Q&A
// -------------------------------------------------------------
function renderDoubtsManager() {
  const doubts = AcademyDB.getDoubts() || [];
  const filter = document.getElementById('doubtStatusFilter')?.value || 'all';
  const container = document.getElementById('doubtsListContainer');
  if (!container) return;

  const filtered = doubts.filter(d => filter === 'all' || d.status === filter);

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-center">No doubts found matching the selected filter.</p>`;
    return;
  }

  container.innerHTML = [...filtered].reverse().map(d => `
    <div class="doubt-card ${d.status === 'Pending' ? 'doubt-pending' : 'doubt-resolved'}" style="background:#fff;border-left:5px solid ${d.status === 'Pending' ? '#e74c3c' : '#27ae60'};padding:16px;margin-bottom:16px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div class="doubt-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <span class="badge ${d.status === 'Pending' ? 'badge-pending' : 'badge-paid'}">${d.status === 'Pending' ? '⏳ Needs Answer' : '✅ Answered'}</span>
          <span class="badge badge-standard">${d.standard}</span>
          <span style="font-weight:600;margin-left:6px;">${d.subject} • ${d.chapter}</span>
        </div>
        <small style="color:#888;">📅 ${d.date}</small>
      </div>
      <h4 style="margin:8px 0;color:#2c3e50;">Student: <strong>${d.studentName}</strong></h4>
      <p style="background:#f8f9fa;padding:12px;border-radius:6px;border-left:3px solid #3498db;font-weight:500;">
        ❓ "${d.question}"
      </p>
      ${d.reply ? `
        <div style="background:#e8f5e9;padding:12px;border-radius:6px;margin-top:10px;border-left:3px solid #27ae60;">
          <p style="margin:0;color:#1e7e34;"><strong>💡 Answer by ${d.repliedBy || 'Nikhillesh Sir'}:</strong></p>
          <p style="margin:4px 0 0 0;">${d.reply}</p>
          <small style="color:#666;">Answered on: ${d.replyDate || 'Recently'}</small>
        </div>
      ` : ''}
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn-primary btn-sm" onclick="openDoubtReplyModal('${d.id}')">
          ${d.reply ? '✏️ Edit Solution' : '💡 Answer Question'}
        </button>
        <button class="btn-sm btn-delete" onclick="deleteDoubt('${d.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

window.openDoubtReplyModal = function(doubtId) {
  const doubts = AcademyDB.getDoubts() || [];
  const doubt = doubts.find(d => d.id === doubtId);
  if (!doubt) return;

  document.getElementById('modalDoubtId').value = doubt.id;
  document.getElementById('modalDoubtQuestion').textContent = `"${doubt.question}" — ${doubt.studentName} (${doubt.subject})`;
  document.getElementById('modalDoubtReply').value = doubt.reply || '';

  document.getElementById('doubtReplyModal').style.display = 'flex';
};

window.deleteDoubt = function(doubtId) {
  if (confirm('Delete this doubt entry?')) {
    let doubts = AcademyDB.getDoubts() || [];
    doubts = doubts.filter(d => d.id !== doubtId);
    AcademyDB.saveDoubts(doubts);
    renderDoubtsManager();
  }
};

// -------------------------------------------------------------
// 10. FEE RECEIPTS & UPI
// -------------------------------------------------------------
function renderReceiptsTable() {
  const receipts = AcademyDB.getReceipts() || [];
  const tbody = document.getElementById('receiptsTableBody');
  if (!tbody) return;

  if (receipts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No fee receipts found.</td></tr>`;
    return;
  }

  tbody.innerHTML = [...receipts].reverse().map(r => `
    <tr>
      <td><code>${r.receiptNo}</code></td>
      <td><strong>${r.studentName}</strong><br><small>${r.standard}</small></td>
      <td><strong>₹${r.amount}</strong><br><small>${r.term}</small></td>
      <td><span class="badge ${r.paymentMode.includes('UPI') ? 'badge-paid' : 'badge-regular'}">${r.paymentMode}</span></td>
      <td><small>${r.date}</small></td>
      <td>
        <div class="action-buttons">
          <button class="btn-sm btn-edit" onclick="printReceipt('${r.receiptNo}')" title="Print Receipt">🖨️ Receipt</button>
          <button class="btn-sm btn-delete" onclick="deleteReceipt('${r.receiptNo}')" title="Delete Receipt">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddReceiptModal = function() {
  const students = AcademyDB.getStudents();
  const studentSelect = document.getElementById('modalReceiptStudent');
  if (studentSelect) {
    studentSelect.innerHTML = students.map(s => `
      <option value="${s.id}|${s.name}|${s.parentName || ''}|${s.standard}">${s.name} (${s.standard} - ${s.id})</option>
    `).join('');
  }
  // Reset form
  const form = document.getElementById('receiptModalForm');
  if (form) form.reset();
  // Hide student info box initially
  document.getElementById('receiptStudentInfo').style.display = 'none';
  // Reset period dropdown
  const periodSelect = document.getElementById('modalReceiptPeriod');
  if (periodSelect) periodSelect.innerHTML = '<option value="">Select Month</option>';
  document.getElementById('rcptSuggestedAmount').textContent = '₹0';

  document.getElementById('receiptModal').style.display = 'flex';
};

window.deleteReceipt = function(receiptNo) {
  if (confirm(`Delete receipt #${receiptNo}?`)) {
    let receipts = AcademyDB.getReceipts() || [];
    receipts = receipts.filter(r => r.receiptNo !== receiptNo);
    AcademyDB.saveReceipts(receipts);
    renderReceiptsTable();
  }
};

window.printReceipt = function(receiptNo) {
  const receipts = AcademyDB.getReceipts() || [];
  const receipt = receipts.find(r => r.receiptNo === receiptNo);
  if (!receipt) return;

  const printArea = document.getElementById('printReceiptContent');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="printable-fee-receipt" style="font-family:inherit;padding:16px;">
      <div class="receipt-header" style="text-align:center;border-bottom:2px solid #1e3c72;padding-bottom:12px;margin-bottom:16px;">
        <h2 style="color:#1e3c72;margin:0 0 4px 0;">🏛️ NIKHILLESH BHATKAR LEARNING ACADEMY</h2>
        <p style="margin:0;font-size:13px;color:#555;">Near S.T. Stand, Sangameshwar, Dist. Ratnagiri — 415611</p>
        <p style="margin:2px 0 0 0;font-size:13px;color:#555;"><strong>Contact:</strong> +91 83800 96494 | <strong>UPI:</strong> nikhileshbhatkar379@oksbi</p>
        <h3 style="margin:12px 0 0 0;text-transform:uppercase;color:#27ae60;letter-spacing:1px;">OFFICIAL FEE RECEIPT</h3>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:14px;">
        <div>
          <p style="margin:3px 0;"><strong>Receipt No:</strong> <code>${receipt.receiptNo}</code></p>
          <p style="margin:3px 0;"><strong>Student Name:</strong> ${receipt.studentName}</p>
          <p style="margin:3px 0;"><strong>Student ID:</strong> ${receipt.studentId}</p>
          <p style="margin:3px 0;"><strong>Parent / Guardian:</strong> ${receipt.parentName || 'Parent'}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:3px 0;"><strong>Date:</strong> ${receipt.date}</p>
          <p style="margin:3px 0;"><strong>Standard:</strong> ${receipt.standard}</p>
          <p style="margin:3px 0;"><strong>Payment Mode:</strong> ${receipt.paymentMode}</p>
          <p style="margin:3px 0;"><strong>Status:</strong> <span style="color:#27ae60;font-weight:bold;">✅ PAID</span></p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f0f4f8;border-top:1px solid #ccc;border-bottom:1px solid #ccc;">
            <th style="padding:8px;text-align:left;border:1px solid #ddd;">Particulars / Course Fee Description</th>
            <th style="padding:8px;text-align:right;border:1px solid #ddd;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px 8px;border:1px solid #ddd;">
              <strong>Tuition &amp; Study Materials Fee</strong><br>
              <small>${receipt.term} • Reference: ${receipt.transactionId || 'Direct Payment'}</small>
            </td>
            <td style="padding:10px 8px;text-align:right;font-size:16px;font-weight:bold;border:1px solid #ddd;">
              ₹${Number(receipt.amount).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f8f9fa;font-weight:bold;font-size:15px;">
            <td style="padding:8px;text-align:right;border:1px solid #ddd;">TOTAL PAID AMOUNT:</td>
            <td style="padding:8px;text-align:right;color:#27ae60;border:1px solid #ddd;">₹${Number(receipt.amount).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px dashed #ccc;">
        <div>
          <small>Thank you for your fee payment.<br>Keep this receipt for academic records.</small>
        </div>
        <div style="text-align:right;">
          _________________________<br>
          <strong>Authorised Signatory</strong><br>
          <small>Nikhillesh Bhatkar Learning Academy</small>
        </div>
      </div>
    </div>
  `;

  document.getElementById('printReceiptModal').style.display = 'flex';
};

// -------------------------------------------------------------
// 11. TIMETABLE MANAGER (RESPONSIVE DUAL-VIEW)
// -------------------------------------------------------------
function renderTimetableManager() {
  const timetable = AcademyDB.getTimetable() || [];
  const standardFilter = document.getElementById('timetableStandardFilter')?.value || 'all';
  const tbody = document.getElementById('timetableTableBody');
  const mobileCardsContainer = document.getElementById('timetableMobileCards');

  // Filter timetable entries while retaining their original storage index
  const filtered = timetable
    .map((t, originalIndex) => ({ ...t, originalIndex }))
    .filter(t => {
      if (standardFilter === 'all') return true;
      return t.standard && (t.standard.includes(standardFilter) || t.standard.toLowerCase().includes(standardFilter.toLowerCase()));
    });

  // Desktop Table Render
  if (tbody) {
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No batch schedules found matching filter.</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(t => `
        <tr>
          <td><span class="badge badge-standard"><strong>${t.standard}</strong></span></td>
          <td><strong>${t.days}</strong></td>
          <td><span style="font-weight:600;color:var(--primary);">${t.time}</span></td>
          <td>${t.subjects}</td>
          <td>👨‍🏫 ${t.faculty}</td>
          <td><span class="badge badge-category">📍 ${t.room}</span></td>
          <td class="text-right table-actions">
            <button class="btn-sm btn-edit" title="Edit Schedule Entry" onclick="editTimetable(${t.originalIndex})">✏️ Edit</button>
            <button class="btn-sm btn-delete" title="Delete Schedule Entry" onclick="deleteTimetable(${t.originalIndex})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Mobile Adaptive Card Grid Render
  if (mobileCardsContainer) {
    if (filtered.length === 0) {
      mobileCardsContainer.innerHTML = `<div class="timetable-empty-card" style="text-align:center;padding:24px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;grid-column:1/-1;">No batch schedules found matching filter.</div>`;
    } else {
      mobileCardsContainer.innerHTML = filtered.map(t => `
        <div class="timetable-card">
          <div class="timetable-card-top">
            <span class="badge badge-standard">${t.standard}</span>
            <span class="badge badge-category">📍 ${t.room}</span>
          </div>
          <div class="timetable-card-body">
            <div class="timetable-card-time">⏰ ${t.time}</div>
            <div class="timetable-card-days">🗓️ <strong>Days:</strong> ${t.days}</div>
            <div class="timetable-card-row">📚 <strong>Subjects:</strong> ${t.subjects}</div>
            <div class="timetable-card-row">👨‍🏫 <strong>Faculty:</strong> ${t.faculty}</div>
          </div>
          <div class="timetable-card-actions">
            <button class="btn-sm btn-edit" onclick="editTimetable(${t.originalIndex})" title="Edit Batch">✏️ Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteTimetable(${t.originalIndex})" title="Delete Batch">🗑️ Delete</button>
          </div>
        </div>
      `).join('');
    }
  }
}

// Timetable Modal Management
const timetableModal = document.getElementById('timetableModal');
const timetableForm = document.getElementById('timetableForm');

window.openTimetableModal = (index = -1) => {
  const timetable = AcademyDB.getTimetable() || [];
  const titleEl = document.getElementById('timetableModalTitle');
  if (titleEl) {
    titleEl.textContent = index >= 0 ? "✏️ Edit Timetable Entry" : "🗓️ Add New Timetable Entry";
  }

  if (index >= 0 && timetable[index]) {
    const t = timetable[index];
    document.getElementById('modalTimetableIndex').value = index;
    document.getElementById('modalTtStandard').value = t.standard;
    document.getElementById('modalTtDays').value = t.days;
    document.getElementById('modalTtTime').value = t.time;
    document.getElementById('modalTtRoom').value = t.room;
    document.getElementById('modalTtSubjects').value = t.subjects;
    document.getElementById('modalTtFaculty').value = t.faculty;
  } else {
    document.getElementById('modalTimetableIndex').value = '';
    if (timetableForm) timetableForm.reset();
  }
  if (timetableModal) timetableModal.style.display = 'flex';
};

window.closeTimetableModal = () => {
  if (timetableModal) timetableModal.style.display = 'none';
};

window.editTimetable = (index) => {
  openTimetableModal(index);
};

window.deleteTimetable = (index) => {
  if (confirm("Are you sure you want to delete this timetable batch entry?")) {
    const timetable = AcademyDB.getTimetable() || [];
    timetable.splice(index, 1);
    AcademyDB.saveTimetable(timetable);
    renderTimetableManager();
    renderOverviewStats();
  }
};

// -------------------------------------------------------------
// 12. HALL OF FAME / TOPPERS
// -------------------------------------------------------------
function renderToppersManager() {
  const toppers = AcademyDB.getToppers() || [];
  const container = document.getElementById('toppersGalleryAdmin');
  if (!container) return;

  if (toppers.length === 0) {
    container.innerHTML = `<p class="text-center">No toppers added yet.</p>`;
    return;
  }

  container.innerHTML = toppers.map((t, idx) => `
    <div class="topper-admin-card" style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:16px;position:relative;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <span class="badge badge-paid">${t.badge || '🏆 Star Performer'}</span>
        <button class="btn-sm btn-delete" onclick="deleteTopper(${idx})" title="Delete Topper">🗑️</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:12px 0;">
        ${t.photo ? `<img src="${t.photo}" alt="${t.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #cba235;">` : `<div style="font-size:36px;background:#fef3c7;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;">👨‍🎓</div>`}
        <div>
          <h3 style="margin:0;font-size:18px;">${t.name}</h3>
          <p style="margin:2px 0;color:#e67e22;font-weight:bold;font-size:16px;">${t.score} — ${t.exam} (${t.year})</p>
          <small style="color:#666;">${t.school || 'Sangameshwar'}</small>
        </div>
      </div>
      <p style="font-size:13px;background:#f8f9fa;padding:8px;border-radius:6px;margin:8px 0;"><strong>🎯 Highlights:</strong> ${t.subjects || 'Maths & Science'}</p>
      ${t.quote ? `<p style="font-size:12px;font-style:italic;color:#555;">"${t.quote}"</p>` : ''}
    </div>
  `).join('');
}

window.openAddTopperModal = function() {
  document.getElementById('topperModalForm').reset();
  uploadedTopperPhotoData = null;
  uploadedTopperPhotoName = '';
  uploadedTopperPhotoType = 'JPG';
  const photoPreview = document.getElementById('topperPhotoSelectedPreview');
  if (photoPreview) photoPreview.style.display = 'none';
  document.getElementById('topperModal').style.display = 'flex';
};

window.deleteTopper = function(index) {
  if (confirm('Delete this topper from Hall of Fame?')) {
    let toppers = AcademyDB.getToppers() || [];
    toppers.splice(index, 1);
    AcademyDB.saveToppers(toppers);
    renderToppersManager();
  }
};

// -------------------------------------------------------------
// 13. WHATSAPP PARENT ALERTS
// -------------------------------------------------------------
function renderWhatsAppStudentOptions() {
  const students = AcademyDB.getStudents();
  const select = document.getElementById('waStudentSelect');
  if (!select) return;

  select.innerHTML = students.map(s => `
    <option value="${s.id}">${s.name} (${s.standard}) — Parent: ${s.parentName || 'Parent'} (${s.parentPhone || s.phone})</option>
  `).join('');
}

window.sendWhatsAppAlert = function(type) {
  const studentId = document.getElementById('waStudentSelect')?.value;
  const students = AcademyDB.getStudents();
  const student = students.find(s => s.id === studentId);
  if (!student) {
    alert('Please select a student.');
    return;
  }

  const parentPhone = (student.parentPhone || student.phone || '').replace(/[^0-9]/g, '');
  if (!parentPhone) {
    alert('No phone number recorded for this student/parent.');
    return;
  }

  let message = '';
  if (type === 'fee') {
    message = `Namaste ${student.parentName || 'Parent'}, greetings from Nikhillesh Bhatkar Learning Academy, Sangameshwar. This is a gentle reminder regarding tuition fees for ${student.name} (${student.standard}). Kindly clear the pending fee at your earliest convenience. You can pay via UPI to nikhileshbhatkar379@oksbi (Nikhillesh Bhatkar - SBI). Thank you!`;
  } else if (type === 'test') {
    const tests = (AcademyDB.getTestResults() || []).filter(t => t.studentId === student.id);
    const lastTest = tests[tests.length - 1];
    if (lastTest) {
      message = `Namaste ${student.parentName || 'Parent'}, test update for ${student.name} (${student.standard}):\nTest: ${lastTest.testTitle}\nSubject: ${lastTest.subject}\nScore: ${lastTest.marksObtained}/${lastTest.totalMarks} (Grade: ${lastTest.grade})\nRemarks: ${lastTest.remarks}\n— Nikhillesh Bhatkar Learning Academy.`;
    } else {
      message = `Namaste ${student.parentName || 'Parent'}, ${student.name} is performing well in class. Please ensure daily revision of Maths & Science formulas. — Nikhillesh Bhatkar Learning Academy.`;
    }
  } else if (type === 'absent') {
    const today = new Date().toLocaleDateString('en-IN');
    message = `Alert: ${student.name} was marked absent in today's class on ${today} at Nikhillesh Bhatkar Learning Academy. Kindly ensure regular attendance. For inquiries: +91 83800 96494.`;
  } else if (type === 'notice') {
    const notices = AcademyDB.getNotices() || [];
    const latest = notices[notices.length - 1];
    message = `Important Academy Notice for ${student.name}'s Parents:\n"${latest ? latest.title + ' — ' + latest.content : 'Upcoming weekly revision test this Sunday at 9:00 AM.'}"\n— Nikhillesh Bhatkar Learning Academy, Sangameshwar.`;
  } else if (type === 'custom') {
    const customGroup = document.getElementById('customMsgGroup');
    if (customGroup.style.display === 'none') {
      customGroup.style.display = 'block';
      return;
    }
    const customText = document.getElementById('waCustomMsg')?.value.trim();
    if (!customText) {
      alert('Please enter your custom message.');
      return;
    }
    message = `Namaste ${student.parentName || 'Parent'},\n${customText}\n— Nikhillesh Bhatkar Learning Academy.`;
  }

  const waUrl = `https://wa.me/91${parentPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
};

window.sendBulkWhatsAppAlert = function(type) {
  const students = AcademyDB.getStudents();
  if (type === 'fee') {
    const pendingStudents = students.filter(s => s.feeStatus === 'Pending');
    if (pendingStudents.length === 0) {
      alert('✅ All enrolled students have their fees marked as Paid!');
      return;
    }
    if (confirm(`Send Fee Reminder to ${pendingStudents.length} students with Pending fees?`)) {
      pendingStudents.forEach((s, i) => {
        setTimeout(() => {
          const parentPhone = (s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
          const msg = `Namaste ${s.parentName || 'Parent'}, gentle reminder regarding pending tuition fees for ${s.name} (${s.standard}) at Nikhillesh Bhatkar Learning Academy. Kindly clear via UPI: nikhileshbhatkar379@oksbi. Thank you!`;
          window.open(`https://wa.me/91${parentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }, i * 600);
      });
    }
  } else if (type === 'notice') {
    const notices = AcademyDB.getNotices();
    const latest = notices[notices.length - 1];
    const msg = latest ? `📢 Academy Notice:\n${latest.title}\n${latest.content}\n— Nikhillesh Bhatkar Learning Academy.` : 'Sunday Test at 9:00 AM.';
    if (confirm(`Broadcast latest notice to all ${students.length} students' parents?`)) {
      students.forEach((s, i) => {
        setTimeout(() => {
          const parentPhone = (s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
          window.open(`https://wa.me/91${parentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }, i * 600);
      });
    }
  } else if (type === 'welcome') {
    if (confirm(`Send Welcome message to all ${students.length} parents?`)) {
      students.forEach((s, i) => {
        setTimeout(() => {
          const parentPhone = (s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
          const msg = `Welcome to Nikhillesh Bhatkar Learning Academy! We are committed to academic excellence in Mathematics & Science for ${s.name}. Academy Helpline: +91 83800 96494.`;
          window.open(`https://wa.me/91${parentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }, i * 600);
      });
    }
  }
};

// -------------------------------------------------------------
// 14. TIMETABLE EDITABLE INTERFACE
// -------------------------------------------------------------
window.showEditableTimetableInterface = function() {
  const timetableTableBody = document.getElementById('timetableTableBody');
  const timetableMobileCards = document.getElementById('timetableMobileCards');

  if (!timetableTableBody && !timetableMobileCards) return;

  // Add CSS class to make table rows/cards editable
  if (timetableTableBody) {
    timetableTableBody.classList.add('editable-mode');

    // Replace action buttons with save/cancel for each row
    const rows = timetableTableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const actionsCell = row.querySelector('.text-right.table-actions');
      if (actionsCell) {
        const index = row.querySelectorAll('td').length > 6 ?
          Array.from(row.querySelectorAll('td')[6].children)
            .findIndex(el => el.textContent.trim() === '✏️ Edit' || el.textContent.trim() === '🗑️ Delete') : -1;

        if (index >= 0) {
          // Save original row data for potential cancel
          const rowData = {
            standard: row.querySelector('td:nth-child(1) .badge-standard')?.textContent.trim() || '',
            days: row.querySelector('td:nth-child(2) strong')?.textContent.trim() || '',
            time: row.querySelector('td:nth-child(3) span')?.textContent.trim() || '',
            subjects: row.querySelector('td:nth-child(4)')?.textContent.trim() || '',
            faculty: row.querySelector('td:nth-child(5)')?.textContent.replace('👨‍🏫 ', '').trim() || '',
            room: row.querySelector('td:nth-child(6) .badge-category')?.textContent.replace('📍 ', '').trim() || ''
          };

          actionsCell.innerHTML = `
            <button class="btn-sm btn-save" onclick="saveTimetableRow(this, ${Array.from(timetableTableBody.rows).indexOf(row)})" title="Save changes">💾 Save</button>
            <button class="btn-sm btn-cancel" onclick="cancelEditTimetableRow(this, ${Array.from(timetableTableBody.rows).indexOf(row)})" title="Cancel editing">✖️ Cancel</button>
          `;

          // Store original data on the row for cancel functionality
          row.dataset.originalData = JSON.stringify(rowData);

          // Make fields editable
          const standardEl = row.querySelector('td:nth-child(1) .badge-standard');
          const daysEl = row.querySelector('td:nth-child(2) strong');
          const timeEl = row.querySelector('td:nth-child(3) span');
          const subjectsEl = row.querySelector('td:nth-child(4)');
          const facultyEl = row.querySelector('td:nth-child(5)');
          const roomEl = row.querySelector('td:nth-child(6) .badge-category');

          if (standardEl) standardEl.contentEditable = 'true';
          if (daysEl) daysEl.contentEditable = 'true';
          if (timeEl) timeEl.contentEditable = 'true';
          if (subjectsEl) subjectsEl.contentEditable = 'true';
          if (facultyEl) facultyEl.contentEditable = 'true';
          if (roomEl) roomEl.contentEditable = 'true';

          // Add visual indicators
          [standardEl, daysEl, timeEl, subjectsEl, facultyEl, roomEl].forEach(el => {
            if (el) {
              el.style.backgroundColor = '#fff3cd';
              el.style.padding = '2px 4px';
              el.style.borderRadius = '3px';
              el.style.border = '1px solid #ffeaa7';
            }
          });
        }
      }
    });
  }

  // Handle mobile cards similarly
  if (timetableMobileCards) {
    timetableMobileCards.classList.add('editable-mode');
    const cards = timetableMobileCards.querySelectorAll('.timetable-card');
    cards.forEach((card, index) => {
      const actionsDiv = card.querySelector('.timetable-card-actions');
      if (actionsDiv) {
        // Save original data
        const standardEl = card.querySelector('.timetable-card-top .badge-standard');
        const roomEl = card.querySelector('.timetable-card-top .badge-category');
        const timeEl = card.querySelector('.timetable-card-time');
        const daysEl = card.querySelector('.timetable-card-days strong');
        const subjectsEl = card.querySelector('.timetable-card-row:contains("Subjects:")');
        const facultyEl = card.querySelector('.timetable-card-row:contains("Faculty:")');

        const rowData = {
          standard: standardEl ? standardEl.textContent.trim() : '',
          room: roomEl ? roomEl.textContent.replace('📍 ', '').trim() : '',
          time: timeEl ? timeEl.textContent.replace('⏰ ', '').trim() : '',
          days: daysEl ? daysEl.textContent.replace('🗓️ ', '').replace('<strong>', '').replace('</strong>', '').trim() : '',
          subjects: subjectsEl ? subjectsEl.textContent.replace('📚 ', '').replace('<strong>', '').replace('</strong>', '').trim() : '',
          faculty: facultyEl ? facultyEl.textContent.replace('👨‍🏫 ', '').replace('<strong>', '').replace('</strong>', '').trim() : ''
        };

        card.dataset.originalData = JSON.stringify(rowData);

        actionsDiv.innerHTML = `
          <button class="btn-sm btn-save" onclick="saveTimetableCard(this, ${index})" title="Save changes">💾 Save</button>
          <button class="btn-sm btn-cancel" onclick="cancelEditTimetableCard(this, ${index})" title="Cancel editing">✖️ Cancel</button>
        `;

        // Make fields editable
        [standardEl, roomEl, timeEl, daysEl, subjectsEl, facultyEl].forEach(el => {
          if (el) {
            el.contentEditable = 'true';
            el.style.backgroundColor = '#fff3cd';
            el.style.padding = '2px 4px';
            el.style.borderRadius = '3px';
            el.style.border = '1px solid #ffeaa7';
          }
        });
      }
    });
  }

  // Update button states
  const editBtn = document.getElementById('editTimetableBtn');
  if (editBtn) {
    editBtn.textContent = '👁️ View Mode';
    editBtn.onclick = function() {
      exitEditableTimetableMode();
    };
    editBtn.title = 'Exit edit mode and return to view-only timetable';
  }
};

function saveTimetableRow(button, rowIndex) {
  const row = button.closest('tr');
  if (!row) return;

  const standardEl = row.querySelector('td:nth-child(1) .badge-standard');
  const daysEl = row.querySelector('td:nth-child(2) strong');
  const timeEl = row.querySelector('td:nth-child(3) span');
  const subjectsEl = row.querySelector('td:nth-child(4)');
  const facultyEl = row.querySelector('td:nth-child(5)');
  const roomEl = row.querySelector('td:nth-child(6) .badge-category');

  const updatedEntry = {
    standard: standardEl ? standardEl.textContent.trim() : '',
    days: daysEl ? daysEl.textContent.trim() : '',
    time: timeEl ? timeEl.textContent.trim() : '',
    subjects: subjectsEl ? subjectsEl.textContent.trim() : '',
    faculty: facultyEl ? facultyEl.textContent.trim() : '',
    room: roomEl ? roomEl.textContent.trim() : ''
  };

  // Validate required fields
  if (!updatedEntry.standard || !updatedEntry.days || !updatedEntry.time || !updatedEntry.subjects || !updatedEntry.faculty || !updatedEntry.room) {
    alert('Please fill in all fields before saving.');
    return;
  }

  const timetable = AcademyDB.getTimetable() || [];
  if (timetable[rowIndex]) {
    timetable[rowIndex] = updatedEntry;
    AcademyDB.saveTimetable(timetable);

    // Reset UI
    resetTimetableEditMode();
    renderTimetableManager();
    renderOverviewStats();

    alert('✅ Timetable entry updated successfully!');
  }
}

function cancelEditTimetableRow(button, rowIndex) {
  const row = button.closest('tr');
  if (!row) return;

  const originalData = JSON.parse(row.dataset.originalData || '{}');

  // Restore original values
  const standardEl = row.querySelector('td:nth-child(1) .badge-standard');
  const daysEl = row.querySelector('td:nth-child(2) strong');
  const timeEl = row.querySelector('td:nth-child(3) span');
  const subjectsEl = row.querySelector('td:nth-child(4)');
  const facultyEl = row.querySelector('td:nth-child(5)');
  const roomEl = row.querySelector('td:nth-child(6) .badge-category');

  if (standardEl) standardEl.textContent = originalData.standard || '';
  if (daysEl) daysEl.textContent = originalData.days || '';
  if (timeEl) timeEl.textContent = originalData.time || '';
  if (subjectsEl) subjectsEl.textContent = originalData.subjects || '';
  if (facultyEl) facultyEl.textContent = originalData.faculty || '';
  if (roomEl) roomEl.textContent = originalData.room || '';

  // Reset UI
  resetTimetableEditMode();
  renderTimetableManager();
}

function saveTimetableCard(button, cardIndex) {
  const card = button.closest('.timetable-card');
  if (!card) return;

  const standardEl = card.querySelector('.timetable-card-top .badge-standard');
  const roomEl = card.querySelector('.timetable-card-top .badge-category');
  const timeEl = card.querySelector('.timetable-card-time');
  const daysEl = card.querySelector('.timetable-card-days strong');
  const subjectsEl = card.querySelector('.timetable-card-row:contains("Subjects:")');
  const facultyEl = card.querySelector('.timetable-card-row:contains("Faculty:")');

  const updatedEntry = {
    standard: standardEl ? standardEl.textContent.trim() : '',
    room: roomEl ? roomEl.textContent.replace('📍 ', '').trim() : '',
    time: timeEl ? timeEl.textContent.replace('⏰ ', '').trim() : '',
    days: daysEl ? daysEl.textContent.replace('🗓️ ', '').replace('<strong>', '').replace('</strong>', '').trim() : '',
    subjects: subjectsEl ? subjectsEl.textContent.replace('📚 ', '').replace('<strong>', '').replace('</strong>', '').trim() : '',
    faculty: facultyEl ? facultyEl.textContent.replace('👨‍🏫 ', '').replace('<strong>', '').replace('</strong>', '').trim() : ''
  };

  // Validate required fields
  if (!updatedEntry.standard || !updatedEntry.room || !updatedEntry.time || !updatedEntry.days || !updatedEntry.subjects || !updatedEntry.faculty) {
    alert('Please fill in all fields before saving.');
    return;
  }

  const timetable = AcademyDB.getTimetable() || [];
  if (timetable[cardIndex]) {
    timetable[cardIndex] = updatedEntry;
    AcademyDB.saveTimetable(timetable);

    // Reset UI
    resetTimetableEditMode();
    renderTimetableManager();
    renderOverviewStats();

    alert('✅ Timetable entry updated successfully!');
  }
}

function cancelEditTimetableCard(button, cardIndex) {
  const card = button.closest('.timetable-card');
  if (!card) return;

  const originalData = JSON.parse(card.dataset.originalData || '{}');

  // Restore original values
  const standardEl = card.querySelector('.timetable-card-top .badge-standard');
  const roomEl = card.querySelector('.timetable-card-top .badge-category');
  const timeEl = card.querySelector('.timetable-card-time');
  const daysEl = card.querySelector('.timetable-card-days strong');
  const subjectsEl = card.querySelector('.timetable-card-row:contains("Subjects:")');
  const facultyEl = card.querySelector('.timetable-card-row:contains("Faculty:")');

  if (standardEl) standardEl.textContent = originalData.standard || '';
  if (roomEl) roomEl.textContent = '📍 ' + (originalData.room || '');
  if (timeEl) timeEl.textContent = '⏰ ' + (originalData.time || '');
  if (daysEl) daysEl.textContent = '🗓️ <strong>' + (originalData.days || '') + '</strong>';
  if (subjectsEl) subjectsEl.textContent = '📚 <strong>' + (originalData.subjects || '') + '</strong>';
  if (facultyEl) facultyEl.textContent = '👨‍🏫 <strong>' + (originalData.faculty || '') + '</strong>';

  // Reset UI
  resetTimetableEditMode();
  renderTimetableManager();
}

function resetTimetableEditMode() {
  // Reset table
  const timetableTableBody = document.getElementById('timetableTableBody');
  if (timetableTableBody) {
    timetableTableBody.classList.remove('editable-mode');
    const rows = timetableTableBody.querySelectorAll('tr');
    rows.forEach(row => {
      // Reset contentEditable and styling
      const standardEl = row.querySelector('td:nth-child(1) .badge-standard');
      const daysEl = row.querySelector('td:nth-child(2) strong');
      const timeEl = row.querySelector('td:nth-child(3) span');
      const subjectsEl = row.querySelector('td:nth-child(4)');
      const facultyEl = row.querySelector('td:nth-child(5)');
      const roomEl = row.querySelector('td:nth-child(6) .badge-category');

      [standardEl, daysEl, timeEl, subjectsEl, facultyEl, roomEl].forEach(el => {
        if (el) {
          el.contentEditable = 'false';
          el.style.backgroundColor = '';
          el.style.padding = '';
          el.style.borderRadius = '';
          el.style.border = '';
        }
      });

      // Restore action buttons
      const actionsCell = row.querySelector('.text-right.table-actions');
      if (actionsCell) {
        actionsCell.innerHTML = `
          <button class="btn-sm btn-edit" title="Edit Schedule Entry" onclick="editTimetable(${Array.from(timetableTableBody.rows).indexOf(row)})">✏️ Edit</button>
          <button class="btn-sm btn-delete" title="Delete Schedule Entry" onclick="deleteTimetable(${Array.from(timetableTableBody.rows).indexOf(row)})">🗑️ Delete</button>
        `;
      }

      // Remove stored data
      delete row.dataset.originalData;
    });
  }

  // Reset mobile cards
  const timetableMobileCards = document.getElementById('timetableMobileCards');
  if (timetableMobileCards) {
    timetableMobileCards.classList.remove('editable-mode');
    const cards = timetableMobileCards.querySelectorAll('.timetable-card');
    cards.forEach((card, index) => {
      // Reset contentEditable and styling
      const standardEl = card.querySelector('.timetable-card-top .badge-standard');
      const roomEl = card.querySelector('.timetable-card-top .badge-category');
      const timeEl = card.querySelector('.timetable-card-time');
      const daysEl = card.querySelector('.timetable-card-days strong');
      const subjectsEl = card.querySelector('.timetable-card-row:contains("Subjects:")');
      const facultyEl = card.querySelector('.timetable-card-row:contains("Faculty:")');

      [standardEl, roomEl, timeEl, daysEl, subjectsEl, facultyEl].forEach(el => {
        if (el) {
          el.contentEditable = 'false';
          el.style.backgroundColor = '';
          el.style.padding = '';
          el.style.borderRadius = '';
          el.style.border = '';
        }
      });

      // Restore action buttons
      const actionsDiv = card.querySelector('.timetable-card-actions');
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <button class="btn-sm btn-edit" onclick="editTimetable(${index})" title="Edit Batch">✏️ Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteTimetable(${index})" title="Delete Batch">🗑️ Delete</button>
        `;
      }

      // Remove stored data
      delete card.dataset.originalData;
    });
  }

  // Reset button
  const editBtn = document.getElementById('editTimetableBtn');
  if (editBtn) {
    editBtn.textContent = '✏️ Edit Existing Entries';
    editBtn.onclick = showEditableTimetableInterface;
    editBtn.title = 'Make existing timetable entries editable';
  }
}

function exitEditableTimetableMode() {
  resetTimetableEditMode();
}

// -------------------------------------------------------------
// 14. EVENT LISTENERS & FORM HANDLERS
// -------------------------------------------------------------
function setupEventListeners() {
  // Modal Triggers
  const openStudentBtn = document.getElementById('openAddStudentModalBtn');
  if (openStudentBtn && !openStudentBtn.onclick) {
    openStudentBtn.addEventListener('click', () => window.openAddStudentModal?.());
  }
  document.getElementById('openAddNoteModalBtn')?.addEventListener('click', openAddNoteModal);
  document.getElementById('openAddPaperModalBtn')?.addEventListener('click', openAddPaperModal);
  document.getElementById('openAddTestBtn')?.addEventListener('click', openAddTestModal);
  document.getElementById('openStandardTestBtn')?.addEventListener('click', openStandardTestModal);
  document.getElementById('stdNextBtn')?.addEventListener('click', stdStepNext);
  document.getElementById('stdBackBtn')?.addEventListener('click', stdStepBack);
  document.getElementById('openAddReceiptBtn')?.addEventListener('click', openAddReceiptModal);
  document.getElementById('openAddTopperBtn')?.addEventListener('click', openAddTopperModal);
  document.getElementById('markTodayAttendanceBtn')?.addEventListener('click', openAttendanceModal);
  document.getElementById('openAddTimetableBtn')?.addEventListener('click', () => openTimetableModal(-1));

  // Quick Action: Add Timetable Entry from Overview
  document.getElementById('quickAddTimetableBtn')?.addEventListener('click', () => {
    switchAdminTab('tab-timetable');
    openTimetableModal(-1);
  });

  // Filters
  document.getElementById('studentSearchInput')?.addEventListener('input', renderStudentsTable);
  document.getElementById('studentStandardFilter')?.addEventListener('change', renderStudentsTable);
  document.getElementById('studentFeeFilter')?.addEventListener('change', renderStudentsTable);

  document.getElementById('noteSearchInput')?.addEventListener('input', renderNotesTable);
  document.getElementById('noteStandardFilter')?.addEventListener('change', renderNotesTable);

  document.getElementById('paperSearchInput')?.addEventListener('input', renderPapersTable);
  document.getElementById('paperStandardFilter')?.addEventListener('change', renderPapersTable);
  document.getElementById('paperTypeFilter')?.addEventListener('change', renderPapersTable);

  document.getElementById('timetableStandardFilter')?.addEventListener('change', renderTimetableManager);

  document.getElementById('testSearchInput')?.addEventListener('input', renderTestsTable);
  document.getElementById('testStandardFilter')?.addEventListener('change', renderTestsTable);
  document.getElementById('attendanceStandardFilter')?.addEventListener('change', renderAttendanceTable);
  document.getElementById('doubtStatusFilter')?.addEventListener('change', renderDoubtsManager);

  // -----------------------------------------------------------
  // DOCUMENT UPLOAD EVENT HANDLERS: NOTES
  // -----------------------------------------------------------
  const noteFileInput = document.getElementById('modalNoteFile');
  const noteDropzone = document.getElementById('noteFileDropzone');
  const noteFilePreview = document.getElementById('noteFileSelectedPreview');
  const removeNoteFileBtn = document.getElementById('removeNoteFileBtn');

  function handleNoteFileSelection(file) {
    if (!file) return;
    uploadedNoteFileName = file.name;
    const ext = file.name.split('.').pop().toUpperCase();
    uploadedNoteFileType = ext || 'PDF';
    const formattedSize = formatByteSize(file.size);

    // Auto-fill title if currently blank
    const titleInput = document.getElementById('modalNoteTitle');
    if (titleInput && !titleInput.value.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedNoteFileData = e.target.result;
    };
    reader.readAsDataURL(file);

    if (noteFilePreview) {
      const nameEl = document.getElementById('noteSelectedFileName');
      const sizeEl = document.getElementById('noteSelectedFileSize');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formattedSize;
      noteFilePreview.style.display = 'flex';
    }
  }

  if (noteFileInput) {
    noteFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleNoteFileSelection(e.target.files[0]);
      }
    });
  }

  if (noteDropzone) {
    // Click on the dropzone area opens the file picker
    noteDropzone.addEventListener('click', (e) => {
      if (e.target === noteDropzone || e.target.closest('.dropzone-icon') || e.target.closest('.dropzone-text') || e.target.closest('.dropzone-hint')) {
        noteFileInput?.click();
      }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      noteDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        noteDropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      noteDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        noteDropzone.classList.remove('drag-over');
      });
    });
    noteDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleNoteFileSelection(e.dataTransfer.files[0]);
      }
    });
    noteDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        noteFileInput?.click();
      }
    });
  }

  if (removeNoteFileBtn) {
    removeNoteFileBtn.addEventListener('click', () => {
      uploadedNoteFileData = null;
      uploadedNoteFileName = '';
      uploadedNoteFileType = 'PDF';
      if (noteFileInput) noteFileInput.value = '';
      if (noteFilePreview) noteFilePreview.style.display = 'none';
    });
  }

  // -----------------------------------------------------------
  // DOCUMENT UPLOAD EVENT HANDLERS: PAPERS & SOLUTIONS
  // -----------------------------------------------------------
  // Question Paper File
  const paperFileInput = document.getElementById('modalPaperFile');
  const paperDropzone = document.getElementById('paperFileDropzone');
  const paperFilePreview = document.getElementById('paperFileSelectedPreview');
  const removePaperFileBtn = document.getElementById('removePaperFileBtn');

  function handlePaperFileSelection(file) {
    if (!file) return;
    uploadedPaperFileName = file.name;
    const ext = file.name.split('.').pop().toUpperCase();
    uploadedPaperFileType = ext || 'PDF';
    const formattedSize = formatByteSize(file.size);

    const titleInput = document.getElementById('modalPaperTitle');
    if (titleInput && !titleInput.value.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedPaperFileData = e.target.result;
    };
    reader.readAsDataURL(file);

    if (paperFilePreview) {
      const nameEl = document.getElementById('paperSelectedFileName');
      const sizeEl = document.getElementById('paperSelectedFileSize');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formattedSize;
      paperFilePreview.style.display = 'flex';
    }
  }

  if (paperFileInput) {
    paperFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePaperFileSelection(e.target.files[0]);
      }
    });
  }

  if (paperDropzone) {
    // Click on the dropzone area opens the file picker
    paperDropzone.addEventListener('click', (e) => {
      if (e.target === paperDropzone || e.target.closest('.dropzone-icon') || e.target.closest('.dropzone-text') || e.target.closest('.dropzone-hint')) {
        paperFileInput?.click();
      }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      paperDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        paperDropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      paperDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        paperDropzone.classList.remove('drag-over');
      });
    });
    paperDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePaperFileSelection(e.dataTransfer.files[0]);
      }
    });
    paperDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        paperFileInput?.click();
      }
    });
  }

  if (removePaperFileBtn) {
    removePaperFileBtn.addEventListener('click', () => {
      uploadedPaperFileData = null;
      uploadedPaperFileName = '';
      uploadedPaperFileType = 'PDF';
      if (paperFileInput) paperFileInput.value = '';
      if (paperFilePreview) paperFilePreview.style.display = 'none';
    });
  }

  // Model Solution / Answer Key File
  const solutionFileInput = document.getElementById('modalPaperSolutionFile');
  const solutionDropzone = document.getElementById('paperSolutionDropzone');
  const solutionFilePreview = document.getElementById('paperSolutionSelectedPreview');
  const removePaperSolutionBtn = document.getElementById('removePaperSolutionBtn');

  function handleSolutionFileSelection(file) {
    if (!file) return;
    uploadedSolutionFileName = file.name;
    const formattedSize = formatByteSize(file.size);

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedSolutionFileData = e.target.result;
    };
    reader.readAsDataURL(file);

    if (solutionFilePreview) {
      const nameEl = document.getElementById('paperSolutionSelectedName');
      const sizeEl = document.getElementById('paperSolutionSelectedSize');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formattedSize;
      solutionFilePreview.style.display = 'flex';
    }
  }

  if (solutionFileInput) {
    solutionFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleSolutionFileSelection(e.target.files[0]);
      }
    });
  }

  if (solutionDropzone) {
    // Click on the dropzone area opens the file picker
    solutionDropzone.addEventListener('click', (e) => {
      if (e.target === solutionDropzone || e.target.closest('.dropzone-icon') || e.target.closest('.dropzone-text') || e.target.closest('.dropzone-hint')) {
        solutionFileInput?.click();
      }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      solutionDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        solutionDropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      solutionDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        solutionDropzone.classList.remove('drag-over');
      });
    });
    solutionDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleSolutionFileSelection(e.dataTransfer.files[0]);
      }
    });
    solutionDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        solutionFileInput?.click();
      }
    });
  }

  if (removePaperSolutionBtn) {
    removePaperSolutionBtn.addEventListener('click', () => {
      uploadedSolutionFileData = null;
      uploadedSolutionFileName = '';
      if (solutionFileInput) solutionFileInput.value = '';
      if (solutionFilePreview) solutionFilePreview.style.display = 'none';
    });
  }

  // -----------------------------------------------------------
  // STUDENT PHOTO UPLOAD: HALL OF FAME TOPPER
  // -----------------------------------------------------------
  const topperPhotoInput = document.getElementById('modalTopperPhoto');
  const topperPhotoDropzone = document.getElementById('topperPhotoDropzone');
  const topperPhotoPreview = document.getElementById('topperPhotoSelectedPreview');
  const removeTopperPhotoBtn = document.getElementById('removeTopperPhotoBtn');

  function handleTopperPhotoSelection(file) {
    if (!file) return;
    uploadedTopperPhotoName = file.name;
    const ext = file.name.split('.').pop().toUpperCase();
    uploadedTopperPhotoType = ext || 'JPG';
    const formattedSize = formatByteSize(file.size);

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedTopperPhotoData = e.target.result;
    };
    reader.readAsDataURL(file);

    if (topperPhotoPreview) {
      const nameEl = document.getElementById('topperPhotoSelectedFileName');
      const sizeEl = document.getElementById('topperPhotoSelectedFileSize');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formattedSize;
      topperPhotoPreview.style.display = 'flex';
    }
  }

  if (topperPhotoInput) {
    topperPhotoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleTopperPhotoSelection(e.target.files[0]);
      }
    });
  }

  if (topperPhotoDropzone) {
    topperPhotoDropzone.addEventListener('click', (e) => {
      if (e.target === topperPhotoDropzone || e.target.closest('.dropzone-icon') || e.target.closest('.dropzone-text') || e.target.closest('.dropzone-hint')) {
        topperPhotoInput?.click();
      }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      topperPhotoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        topperPhotoDropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      topperPhotoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        topperPhotoDropzone.classList.remove('drag-over');
      });
    });
    topperPhotoDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleTopperPhotoSelection(e.dataTransfer.files[0]);
      }
    });
    topperPhotoDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        topperPhotoInput?.click();
      }
    });
  }

  if (removeTopperPhotoBtn) {
    removeTopperPhotoBtn.addEventListener('click', () => {
      uploadedTopperPhotoData = null;
      uploadedTopperPhotoName = '';
      uploadedTopperPhotoType = 'JPG';
      if (topperPhotoInput) topperPhotoInput.value = '';
      if (topperPhotoPreview) topperPhotoPreview.style.display = 'none';
    });
  }

  // Student Form Submission
  const studentForm = document.getElementById('studentModalForm');
  if (studentForm) {
    studentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = document.getElementById('modalStudentId').value;
      const students = AcademyDB.getStudents();

      if (studentId) {
        // Edit existing student
        const student = students.find(s => s.id === studentId);
        if (student) {
          student.name = document.getElementById('modalStudentName').value.trim();
          student.standard = document.getElementById('modalStudentStandard').value;
          student.phone = document.getElementById('modalStudentPhone').value.trim();
          student.pin = document.getElementById('modalStudentPin').value.trim();
          student.parentName = document.getElementById('modalParentName').value.trim();
          student.parentPhone = document.getElementById('modalParentPhone').value.trim();
          student.feeStatus = document.getElementById('modalFeeStatus').value;
          student.monthlyFee = Number(document.getElementById('modalMonthlyFee').value) || 0;
        }
      } else {
        // Create new student — assign the next sequential ID after the
        // highest existing one so IDs never collide (even after deletions).
        let maxIdNum = 1000;
        students.forEach(s => {
          const match = (s.id || '').match(/STU-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxIdNum) maxIdNum = num;
          }
        });
        const newId = 'STU-' + (maxIdNum + 1);
        students.push({
          id: newId,
          name: document.getElementById('modalStudentName').value.trim(),
          standard: document.getElementById('modalStudentStandard').value,
          phone: document.getElementById('modalStudentPhone').value.trim(),
          pin: document.getElementById('modalStudentPin').value.trim() || 'student123',
          parentName: document.getElementById('modalParentName').value.trim(),
          parentPhone: document.getElementById('modalParentPhone').value.trim(),
          feeStatus: document.getElementById('modalFeeStatus').value,
          monthlyFee: Number(document.getElementById('modalMonthlyFee').value) || 0,
          enrolledDate: new Date().toISOString().split('T')[0],
          role: 'student'
        });
      }

      AcademyDB.saveStudents(students);
      closeStudentModal();
      renderStudentsTable();
      renderAttendanceTable(); // attendance tracker now driven by student list
      renderOverviewStats();
      renderWhatsAppStudentOptions();
      alert('✅ Student record saved successfully!');
    });
  }

  // Note Form Submission
  const noteForm = document.getElementById('noteModalForm');
  if (noteForm) {
    noteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const notes = AcademyDB.getNotes();
      const newId = 'NOTE-' + (100 + notes.length + 1);
      const title = document.getElementById('modalNoteTitle').value.trim();
      const externalUrl = document.getElementById('modalNoteUrl')?.value.trim() || '';
      const formattedSize = uploadedNoteFileName ? (document.getElementById('noteSelectedFileSize')?.textContent || '2.0 MB') : '2.0 MB';

      notes.push({
        id: newId,
        title: title,
        standard: document.getElementById('modalNoteStandard').value,
        subject: document.getElementById('modalNoteSubject').value.trim(),
        chapter: document.getElementById('modalNoteChapter').value.trim(),
        fileType: uploadedNoteFileType || 'PDF',
        size: formattedSize,
        date: new Date().toISOString().split('T')[0],
        fileName: uploadedNoteFileName || `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${(uploadedNoteFileType || 'pdf').toLowerCase()}`,
        fileData: uploadedNoteFileData || null,
        downloadUrl: externalUrl || '#',
        description: document.getElementById('modalNoteDesc').value.trim()
      });

      AcademyDB.saveNotes(notes);
      closeNoteModal();
      renderNotesTable();
      renderOverviewStats();
      alert('✅ Study note document uploaded & published successfully!');
    });
  }

  // Paper Form Submission
  const paperForm = document.getElementById('paperModalForm');
  if (paperForm) {
    paperForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const papers = AcademyDB.getPapers() || [];
      const newId = 'PAPER-' + (100 + papers.length + 1);
      const title = document.getElementById('modalPaperTitle').value.trim();
      const externalUrl = document.getElementById('modalPaperUrl')?.value.trim() || '';
      const solutionUrl = document.getElementById('modalPaperSolutionUrl')?.value.trim() || '';
      const hasSolution = !!uploadedSolutionFileData || !!solutionUrl;
      const formattedPaperSize = uploadedPaperFileName ? (document.getElementById('paperSelectedFileSize')?.textContent || '2.5 MB') : '2.5 MB';
      const formattedSolSize = uploadedSolutionFileName ? (document.getElementById('paperSolutionSelectedSize')?.textContent || '3.0 MB') : '3.0 MB';

      papers.push({
        id: newId,
        title: title,
        standard: document.getElementById('modalPaperStandard').value,
        subject: document.getElementById('modalPaperSubject').value.trim(),
        year: document.getElementById('modalPaperYear').value.trim(),
        type: document.getElementById('modalPaperType').value,
        marks: document.getElementById('modalPaperMarks').value.trim() || '40 Marks',
        duration: document.getElementById('modalPaperDuration').value.trim() || '2 Hours',
        fileType: uploadedPaperFileType || 'PDF',
        size: formattedPaperSize,
        date: new Date().toISOString().split('T')[0],
        fileName: uploadedPaperFileName || `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${(uploadedPaperFileType || 'pdf').toLowerCase()}`,
        fileData: uploadedPaperFileData || null,
        solutionAvailable: hasSolution,
        solutionFileName: uploadedSolutionFileName || (hasSolution ? `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Solution.pdf` : ''),
        solutionData: uploadedSolutionFileData || null,
        solutionSize: formattedSolSize,
        downloadUrl: externalUrl || '#',
        solutionUrl: solutionUrl || '#',
        description: document.getElementById('modalPaperDesc').value.trim(),
        enrollmentRequired: document.getElementById('modalPaperEnrollmentRequired').checked,
        isSamplePaper: document.getElementById('modalPaperIsSample').checked
      });

      AcademyDB.savePapers(papers);
      closePaperModal();
      renderPapersTable();
      renderOverviewStats();
      alert('✅ Board Question Paper & Model Solution uploaded successfully!');
    });
  }

  // Notice Form Submission
  const noticeForm = document.getElementById('createNoticeForm');
  if (noticeForm) {
    noticeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const notices = AcademyDB.getNotices();
      const newId = 'NOT-' + (100 + notices.length + 1);

      notices.push({
        id: newId,
        title: document.getElementById('noticeTitle').value.trim(),
        category: document.getElementById('noticeCategory').value,
        date: new Date().toISOString().split('T')[0],
        content: document.getElementById('noticeContent').value.trim()
      });

      AcademyDB.saveNotices(notices);
      noticeForm.reset();
      renderNoticesManager();
      renderOverviewStats();
      alert('📢 Announcement broadcasted to student portals successfully!');
    });
  }

  // Test Form Submission
  const testForm = document.getElementById('testModalForm');
  if (testForm) {
    testForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentRaw = document.getElementById('modalTestStudent').value.split('|');
      const studentId = studentRaw[0];
      const studentName = studentRaw[1];
      const standard = studentRaw[2];

      const tests = AcademyDB.getTestResults() || [];
      const total = Number(document.getElementById('modalTestTotal').value);
      const obtained = Number(document.getElementById('modalTestObtained').value);
      const pct = (obtained / total) * 100;
      let grade = 'A';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 75) grade = 'A';
      else if (pct >= 60) grade = 'B+';
      else if (pct >= 50) grade = 'B';
      else grade = 'C';

      tests.push({
        id: 'TEST-' + (100 + tests.length + 1),
        studentId,
        studentName,
        standard,
        testTitle: document.getElementById('modalTestTitle').value.trim(),
        subject: document.getElementById('modalTestSubject').value.trim(),
        date: document.getElementById('modalTestDate').value,
        totalMarks: total,
        marksObtained: obtained,
        grade,
        remarks: document.getElementById('modalTestRemarks').value.trim() || 'Good performance.'
      });

      AcademyDB.saveTestResults(tests);
      document.getElementById('testModal').style.display = 'none';
      testForm.reset();
      renderTestsTable();
      alert('✅ Test marks logged successfully!');
    });
  }

  // Save Standard-Wise Test Button (Step 2: per-student marks)
  document.getElementById('saveStandardTestBtn')?.addEventListener('click', () => {
    const std = document.getElementById('stdSelect')?.value || '';
    const examTitle = document.getElementById('examTitle')?.value.trim();
    const examSubject = document.getElementById('examSubject')?.value.trim();
    const examDate = document.getElementById('examDate')?.value || new Date().toISOString().split('T')[0];
    const examTotal = Number(document.getElementById('examTotal')?.value || 0);
    const examPass = Number(document.getElementById('examPass')?.value || 0);

    if (!std || !examTitle || !examSubject || examTotal <= 0) {
      alert('⚠️ Please go back and fill in the common details first.');
      return;
    }

    const students = (AcademyDB.getStudents() || []).filter(s => s.standard === std);
    if (students.length === 0) {
      alert('⚠️ No students enrolled for ' + std);
      return;
    }

    const tests = AcademyDB.getTestResults() || [];
    let saved = 0;
    students.forEach(s => {
      const marksInput = document.getElementById('stdMarks-' + s.id);
      const remarksInput = document.getElementById('stdRemarks-' + s.id);
      const obtained = Number(marksInput?.value || 0);
      const remarks = remarksInput?.value.trim() || 'Class test';

      const pct = examTotal > 0 ? (obtained / examTotal) * 100 : 0;
      let grade = 'B';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 75) grade = 'A';
      else if (pct >= 60) grade = 'B+';
      else if (pct >= 50) grade = 'B';
      else grade = 'C';

      tests.push({
        id: 'TEST-' + (100 + tests.length + saved + 1),
        studentId: s.id,
        studentName: s.name,
        standard: s.standard,
        testTitle: examTitle,
        subject: examSubject,
        date: examDate,
        totalMarks: examTotal,
        marksObtained: obtained,
        grade,
        remarks
      });
      saved++;
    });

    AcademyDB.saveTestResults(tests);
    document.getElementById('standardTestModal').style.display = 'none';
    renderTestsTable();
    alert(`✅ Saved test results for ${saved} student(s) of ${std}!`);
  });

  // Receipt Form Submission
  const receiptForm = document.getElementById('receiptModalForm');
  if (receiptForm) {
    receiptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentRaw = document.getElementById('modalReceiptStudent').value.split('|');
      const studentId = studentRaw[0];
      const studentName = studentRaw[1];
      const parentName = studentRaw[2];
      const standard = studentRaw[3];

      const students = AcademyDB.getStudents();
      const student = students.find(s => s.id === studentId);
      const receipts = AcademyDB.getReceipts() || [];

      const period = document.getElementById('modalReceiptPeriod').value;
      const amount = Number(document.getElementById('modalReceiptAmount').value);
      const paymentMode = document.getElementById('modalReceiptMode').value;
      const transactionId = document.getElementById('modalReceiptTxnId').value.trim() || `UPI/${Date.now().toString().slice(-6)}`;
      const remarks = document.getElementById('modalReceiptRemarks').value.trim();

      // Calculate totals
      const studentReceipts = receipts.filter(r => r.studentId === studentId);
      const totalPaid = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0) + amount;
      const monthlyFee = student?.monthlyFee || 0;
      const enrolledDate = student?.enrolledDate ? new Date(student.enrolledDate) : new Date();
      const { monthsEnrolled, totalExpected, balance } = computeFeeBalance(monthlyFee, enrolledDate, totalPaid);

      const newReceiptNo = 'REC-' + new Date().getFullYear() + '-' + String(receipts.length + 101).padStart(3, '0');

      const newReceipt = {
        receiptNo: newReceiptNo,
        studentId,
        studentName,
        parentName,
        standard,
        amount,
        period,
        paymentMode,
        transactionId,
        remarks,
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        collectedBy: 'Nikhillesh Bhatkar',
        monthlyFee,
        totalPaid,
        totalExpected,
        balance
      };

      receipts.push(newReceipt);
      AcademyDB.saveReceipts(receipts);

      // Update student fee status based on balance
      if (student) {
        student.feeStatus = balance <= 0 ? 'Paid' : 'Pending';
        AcademyDB.saveStudents(students);
        renderStudentsTable();
      }

      document.getElementById('receiptModal').style.display = 'none';
      receiptForm.reset();
      renderReceiptsTable();

      // Auto-open print receipt
      printFeeReceipt(newReceipt);

      alert(`✅ Fee receipt ${newReceiptNo} generated for ${studentName}!`);
    });
  }

  // Topper Form Submission
  const topperForm = document.getElementById('topperModalForm');
  if (topperForm) {
    topperForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const toppers = AcademyDB.getToppers() || [];

      toppers.push({
        name: document.getElementById('modalTopperName').value.trim(),
        score: document.getElementById('modalTopperScore').value.trim(),
        exam: document.getElementById('modalTopperExam').value.trim(),
        year: document.getElementById('modalTopperYear').value.trim(),
        subjects: document.getElementById('modalTopperSubjects').value.trim() || 'Maths & Science',
        quote: document.getElementById('modalTopperQuote').value.trim(),
        badge: '🏆 Academy Star Merit',
        photo: uploadedTopperPhotoData || null,
        photoName: uploadedTopperPhotoName || '',
        photoType: uploadedTopperPhotoType || 'JPG'
      });

      AcademyDB.saveToppers(toppers);
      document.getElementById('topperModal').style.display = 'none';
      topperForm.reset();
      uploadedTopperPhotoData = null;
      uploadedTopperPhotoName = '';
      uploadedTopperPhotoType = 'JPG';
      if (topperPhotoPreview) topperPhotoPreview.style.display = 'none';
      renderToppersManager();
      alert('🏆 Added student achievement to Hall of Fame!');
    });
  }

  // Publish Hall of Fame to the public website.
  // Downloads hall-of-fame.json so the admin can commit & push it —
  // localStorage edits alone never reach other visitors on static GitHub Pages.
  function getToppersPayload() {
    const toppers = AcademyDB.getToppers() || [];
    return {
      version: 1,
      updated: new Date().toISOString().split('T')[0],
      toppers
    };
  }

  document.getElementById('publishToppersBtn')?.addEventListener('click', () => {
    const toppers = AcademyDB.getToppers() || [];
    if (toppers.length === 0) {
      alert('No toppers to publish. Add at least one first.');
      return;
    }
    const payload = getToppersPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    downloadFile(jsonStr, 'hall-of-fame.json', 'application/json');

    const modal = document.getElementById('publishToppersModal');
    if (modal) {
      modal.style.display = 'flex';
    } else {
      alert('✅ Downloaded hall-of-fame.json!\n\nTo make these toppers live on the public site, place it in data/ and push to GitHub.');
    }
  });

  document.getElementById('copyToppersJsonBtn')?.addEventListener('click', () => {
    const payload = getToppersPayload();
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
      .then(() => alert('📋 Hall of Fame JSON copied to clipboard!'))
      .catch(() => alert('Could not copy automatically. You can use the downloaded file.'));
  });

  document.getElementById('redownloadToppersBtn')?.addEventListener('click', () => {
    const payload = getToppersPayload();
    downloadFile(JSON.stringify(payload, null, 2), 'hall-of-fame.json', 'application/json');
  });

  // Doubt Reply Form Submission
  const doubtReplyForm = document.getElementById('doubtReplyForm');
  if (doubtReplyForm) {
    doubtReplyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const doubtId = document.getElementById('modalDoubtId').value;
      const replyText = document.getElementById('modalDoubtReply').value.trim();
      const repliedBy = document.getElementById('modalDoubtRepliedBy').value;

      const doubts = AcademyDB.getDoubts() || [];
      const doubt = doubts.find(d => d.id === doubtId);
      if (doubt) {
        doubt.reply = replyText;
        doubt.repliedBy = repliedBy;
        doubt.replyDate = new Date().toISOString().split('T')[0];
        doubt.status = 'Resolved';
        AcademyDB.saveDoubts(doubts);
        document.getElementById('doubtReplyModal').style.display = 'none';
        doubtReplyForm.reset();
        renderDoubtsManager();
        alert('✅ Solution posted to student portal successfully!');
      }
    });
  }

  // Timetable Form Submission
  if (timetableForm) {
    timetableForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const index = document.getElementById('modalTimetableIndex').value;
      const timetable = AcademyDB.getTimetable() || [];

      const entry = {
        standard: document.getElementById('modalTtStandard').value,
        days: document.getElementById('modalTtDays').value,
        time: document.getElementById('modalTtTime').value,
        subjects: document.getElementById('modalTtSubjects').value.trim(),
        faculty: document.getElementById('modalTtFaculty').value.trim(),
        room: document.getElementById('modalTtRoom').value.trim()
      };

      if (index !== '') {
        // Edit existing entry
        timetable[index] = entry;
      } else {
        // Add new entry
        timetable.push(entry);
      }

      AcademyDB.saveTimetable(timetable);
      document.getElementById('timetableModal').style.display = 'none';
      timetableForm.reset();
      renderTimetableManager();
      renderOverviewStats();
      alert('✅ Timetable schedule entry saved successfully!');
    });
  }

  // Backdrop click dismissal for all modals
  const modalOverlays = [
    'studentModal', 'noteModal', 'paperModal', 'timetableModal',
    'testModal', 'receiptModal', 'topperModal', 'attendanceModal',
    'doubtReplyModal', 'printReceiptModal'
  ];
  modalOverlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.style.display = 'none';
        }
      });
    }
  });

  // Escape key dismissal for all modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modalOverlays.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display === 'flex') {
          el.style.display = 'none';
        }
      });
    }
  });

  // Save Attendance Button
  document.getElementById('saveAttendanceBtn')?.addEventListener('click', () => {
    const selects = document.querySelectorAll('.att-status');
    const topic = document.getElementById('attendanceTopicInput')?.value.trim() || 'Regular Class Session';
    const date = document.getElementById('attendanceDateInput')?.value || new Date().toISOString().split('T')[0];

    let attendance = AcademyDB.getAttendance() || [];
    const students = AcademyDB.getStudents() || [];

    selects.forEach(sel => {
      const stuId = sel.getAttribute('data-id');
      const status = sel.value; // Present | Absent | Leave
      const student = students.find(s => s.id === stuId);
      let rec = attendance.find(a => a.studentId === stuId);

      // Auto-create an attendance record for students who have none yet
      if (!rec && student) {
        rec = {
          studentId: student.id,
          studentName: student.name,
          standard: student.standard,
          totalLectures: 0,
          attendedLectures: 0,
          percentage: 0,
          lastMarkedDate: null,
          status: 'Absent',
          leaveCount: 0,
          history: []
        };
        attendance.push(rec);
      }
      if (!rec) return;
      if (!rec.leaveCount) rec.leaveCount = 0;

      const wasLeave = (rec.status === 'Leave');
      const nowLeave = (status === 'Leave');

      if (nowLeave && !wasLeave) rec.leaveCount += 1;
      if (!nowLeave && wasLeave) rec.leaveCount = Math.max(0, rec.leaveCount - 1);

      rec.totalLectures += 1;
      if (status === 'Present') rec.attendedLectures += 1;
      // Absent and Leave both do NOT add to attendedLectures

      const effectiveTotal = Math.max(1, rec.totalLectures - rec.leaveCount);
      rec.percentage = Math.round((rec.attendedLectures / effectiveTotal) * 1000) / 10;
      rec.lastMarkedDate = date;
      rec.status = status;
      if (!rec.history) rec.history = [];
      rec.history.unshift({ date, status, topic });
    });

    AcademyDB.saveAttendance(attendance);
    document.getElementById('attendanceModal').style.display = 'none';
    renderAttendanceTable();
    alert('✅ Daily attendance records saved!');
  });

  // Change Password Form
  const passForm = document.getElementById('changePasswordForm');
  if (passForm) {
    passForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const current = document.getElementById('currentAdminPass').value;
      const newPass = document.getElementById('newAdminPass').value;
      const confirmPass = document.getElementById('confirmAdminPass').value;

      const admin = AcademyDB.getAdmin();
      if (current !== admin.password) {
        alert('❌ Current password does not match.');
        return;
      }
      if (newPass.length < 6) {
        alert('❌ New password must be at least 6 characters long.');
        return;
      }
      if (newPass !== confirmPass) {
        alert('❌ New password and confirmation do not match.');
        return;
      }

      admin.password = newPass;
      AcademyDB.saveAdmin(admin);
      passForm.reset();
      alert('✅ Admin password updated successfully!');
    });
  }

  // Import & Export CSV Buttons
  const importCsvBtn = document.getElementById('importStudentsCsvBtn');
  const importCsvInput = document.getElementById('importStudentsCsvInput');
  const exportStudentsBtn = document.getElementById('exportStudentsCsvBtn');

  if (importCsvBtn && !importCsvBtn.onclick) {
    importCsvBtn.addEventListener('click', () => window.triggerStudentCsvImport?.());
  }

  if (importCsvInput && !importCsvInput.onchange) {
    importCsvInput.addEventListener('change', (e) => window.handleStudentCsvUpload?.(e));
  }

  if (exportStudentsBtn && !exportStudentsBtn.onclick) {
    exportStudentsBtn.addEventListener('click', () => window.exportStudentsToCsv?.());
  }

  document.getElementById('resequenceStudentIdsBtn')?.addEventListener('click', window.resequenceStudentIds);

  document.getElementById('exportInquiriesCsvBtn')?.addEventListener('click', () => {
    const inquiries = AcademyDB.getInquiries();
    let csv = 'Date,Name,Phone,Email,Standard,Type,Status\n';
    inquiries.forEach(i => {
      csv += `"${i.date}","${i.name}","${i.phone}","${i.email || ''}","${i.standard}","${i.type}","${i.status}"\n`;
    });
    downloadFile(csv, 'academy_inquiries_leads.csv', 'text/csv');
  });

  document.getElementById('exportReceiptsCsvBtn')?.addEventListener('click', () => {
    const receipts = AcademyDB.getReceipts() || [];
    let csv = 'Receipt No,Student ID,Student Name,Standard,Amount,Term,Payment Mode,Transaction ID,Date\n';
    receipts.forEach(r => {
      csv += `"${r.receiptNo}","${r.studentId}","${r.studentName}","${r.standard}","${r.amount}","${r.term}","${r.paymentMode}","${r.transactionId || ''}","${r.date}"\n`;
    });
    downloadFile(csv, 'academy_fee_receipts.csv', 'text/csv');
  });

  // Backup & Restore
  document.getElementById('downloadBackupBtn')?.addEventListener('click', () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      admin: AcademyDB.getAdmin(),
      students: AcademyDB.getStudents(),
      notes: AcademyDB.getNotes(),
      papers: AcademyDB.getPapers(),
      notices: AcademyDB.getNotices(),
      inquiries: AcademyDB.getInquiries(),
      tests: AcademyDB.getTestResults(),
      attendance: AcademyDB.getAttendance(),
      doubts: AcademyDB.getDoubts(),
      receipts: AcademyDB.getReceipts(),
      timetable: AcademyDB.getTimetable(),
      toppers: AcademyDB.getToppers()
    };
    downloadFile(JSON.stringify(backupData, null, 2), `academy_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  });

  document.getElementById('restoreFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.students && (data.notes || data.papers)) {
          if (confirm('Are you sure you want to restore data from this file? It will replace current records.')) {
            if (data.admin) AcademyDB.saveAdmin(data.admin);
            if (data.students) AcademyDB.saveStudents(data.students);
            if (data.notes) AcademyDB.saveNotes(data.notes);
            if (data.papers) AcademyDB.savePapers(data.papers);
            if (data.notices) AcademyDB.saveNotices(data.notices);
            if (data.inquiries) AcademyDB.saveInquiries(data.inquiries);
            if (data.tests) AcademyDB.saveTestResults(data.tests);
            if (data.attendance) AcademyDB.saveAttendance(data.attendance);
            if (data.doubts) AcademyDB.saveDoubts(data.doubts);
            if (data.receipts) AcademyDB.saveReceipts(data.receipts);
            if (data.timetable) AcademyDB.saveTimetable(data.timetable);
            if (data.toppers) AcademyDB.saveToppers(data.toppers);
            loadAllAdminData();
            alert('✅ Academy database restored successfully!');
          }
        } else {
          alert('❌ Invalid backup file format.');
        }
      } catch (err) {
        alert('❌ Error reading JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetDefaultDataBtn')?.addEventListener('click', () => {
    if (confirm('⚠️ WARNING: This will reset all students, notes, inquiries, tests, and attendance to initial demo state. Continue?')) {
      AcademyDB.resetToDefaults();
      loadAllAdminData();
      alert('✅ Database reset to initial state.');
    }
  });
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// CSV Parser & Student Import
// -------------------------------------------------------------
function parseCSV(text) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += c;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) lines.push(currentRow);
  }
  return lines;
}

function normalizeStandard(str) {
  const s = (str || '').trim();
  const lower = s.toLowerCase();
  if (lower.includes('10') || lower.includes('ssc')) return 'Standard 10 (SSC)';
  if (lower.includes('12') || lower.includes('hsc')) return 'Standard 12 (HSC)';
  if (lower === '8' || lower.includes('8th') || lower.includes('standard 8')) return 'Standard 8';
  if (lower === '9' || lower.includes('9th') || lower.includes('standard 9')) return 'Standard 9';
  if (lower.includes('ai') || lower.includes('stock')) return 'Special: AI & Stock Market';
  return s || 'Standard 10 (SSC)';
}

function importStudentsFromCSV(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    alert('The CSV file is empty.');
    return;
  }

  // Detect header row
  const headerRow = rows[0].map(h => (h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  let idCol = headerRow.findIndex(h => h.includes('studentid') || h === 'id' || h.includes('roll'));
  let nameCol = headerRow.findIndex(h => h.includes('name') && !h.includes('parent'));
  let standardCol = headerRow.findIndex(h => h.includes('standard') || h.includes('grade') || h.includes('class'));
  let phoneCol = headerRow.findIndex(h => (h.includes('phone') || h.includes('mobile') || h.includes('contact')) && !h.includes('parent'));
  let pinCol = headerRow.findIndex(h => h.includes('pin') || h.includes('pass') || h.includes('pwd'));
  let parentNameCol = headerRow.findIndex(h => h.includes('parentname') || h.includes('fathername') || h === 'parent');
  let parentPhoneCol = headerRow.findIndex(h => h.includes('parentphone') || h.includes('parentmobile') || h.includes('fatherphone'));
  let feeStatusCol = headerRow.findIndex(h => h.includes('fee') || h.includes('payment') || h === 'status');
  let enrolledDateCol = headerRow.findIndex(h => h.includes('enroll') || h.includes('admission') || h.includes('date'));

  let startIndex = 1;
  // If no header row detected, assume standard export order:
  // 0: ID, 1: Name, 2: Standard, 3: Phone, 4: PIN, 5: Parent Name, 6: Parent Phone, 7: Fee Status, 8: Enrolled Date
  if (nameCol === -1) {
    idCol = 0;
    nameCol = 1;
    standardCol = 2;
    phoneCol = 3;
    pinCol = 4;
    parentNameCol = 5;
    parentPhoneCol = 6;
    feeStatusCol = 7;
    enrolledDateCol = 8;
    startIndex = 0;
  }

  const existingStudents = AcademyDB.getStudents() || [];
  let maxIdNum = 1000;
  existingStudents.forEach(s => {
    const match = (s.id || '').match(/STU-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });

  let addedCount = 0;
  let updatedCount = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const name = (nameCol >= 0 && row[nameCol] ? row[nameCol] : '').trim();
    if (!name) continue; // Skip rows without student name

    const phone = (phoneCol >= 0 && row[phoneCol] ? row[phoneCol] : '').trim();
    const rawId = (idCol >= 0 && row[idCol] ? row[idCol] : '').trim();
    const standard = normalizeStandard(standardCol >= 0 && row[standardCol] ? row[standardCol] : '');
    const pin = (pinCol >= 0 && row[pinCol] ? row[pinCol] : '').trim() || 'student123';
    const parentName = (parentNameCol >= 0 && row[parentNameCol] ? row[parentNameCol] : '').trim();
    const parentPhone = (parentPhoneCol >= 0 && row[parentPhoneCol] ? row[parentPhoneCol] : '').trim();
    const rawFee = (feeStatusCol >= 0 && row[feeStatusCol] ? row[feeStatusCol] : '').trim().toLowerCase();
    const feeStatus = rawFee.includes('paid') ? 'Paid' : 'Pending';
    const enrolledDate = (enrolledDateCol >= 0 && row[enrolledDateCol] ? row[enrolledDateCol] : '').trim() || today;

    // Check if student exists by ID or Phone
    let existing = null;
    if (rawId) {
      existing = existingStudents.find(s => (s.id || '').toLowerCase() === rawId.toLowerCase());
    }
    if (!existing && phone) {
      existing = existingStudents.find(s => (s.phone || '').trim() === phone);
    }

    if (existing) {
      existing.name = name;
      existing.standard = standard;
      if (phone) existing.phone = phone;
      if (pin) existing.pin = pin;
      if (parentName) existing.parentName = parentName;
      if (parentPhone) existing.parentPhone = parentPhone;
      existing.feeStatus = feeStatus;
      updatedCount++;
    } else {
      maxIdNum++;
      const assignedId = rawId || `STU-${maxIdNum}`;
      existingStudents.push({
        id: assignedId,
        name,
        standard,
        phone: phone || `980000${String(maxIdNum).padStart(4, '0')}`,
        pin,
        parentName,
        parentPhone,
        feeStatus,
        enrolledDate,
        role: 'student'
      });
      addedCount++;
    }
  }

  if (addedCount === 0 && updatedCount === 0) {
    alert('No valid student records found in the CSV file.');
    return;
  }

  AcademyDB.saveStudents(existingStudents);
  renderStudentsTable();
  renderOverviewStats();
  renderWhatsAppStudentOptions();
  alert(`✅ Successfully imported students from CSV!\n\n• ${addedCount} student(s) added\n• ${updatedCount} student(s) updated\nTotal students in directory: ${existingStudents.length}`);
}

// -------------------------------------------------------------
// INITIALIZE ADMIN PORTAL (After all functions and handlers are defined)
// -------------------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPortal);
} else {
  initAdminPortal();
}
