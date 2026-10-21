// ------------------------------------------------------------------
// Nikhillesh Bhatkar Learning Academy — Admin Dashboard Controller
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // 1. Enforce Authentication
  const user = Auth.requireAuth('admin');
  if (!user) return;

  const adminDisplayName = document.getElementById('adminDisplayName');
  if (adminDisplayName && user.name) {
    adminDisplayName.textContent = user.name;
  }

  // Logout Handler
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of Admin Dashboard?')) {
        Auth.logout();
      }
    });
  }

  // Sidebar Mobile Toggle
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const adminSidebar = document.getElementById('adminSidebar');
  if (sidebarToggleBtn && adminSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      adminSidebar.classList.toggle('open');
    });
  }

  // 2. Sidebar Tab Navigation
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  window.switchAdminTab = function(targetTabId) {
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
    refreshActiveTabData(targetTabId);
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      window.switchAdminTab(tabId);
    });
  });

  // Quick Action Buttons on Overview Tab
  document.getElementById('quickAddStudentBtn')?.addEventListener('click', () => {
    window.switchAdminTab('tab-students');
    openAddStudentModal();
  });
  document.getElementById('quickAddNoteBtn')?.addEventListener('click', () => {
    window.switchAdminTab('tab-notes');
    openAddNoteModal();
  });
  document.getElementById('quickAddPaperBtn')?.addEventListener('click', () => {
    window.switchAdminTab('tab-papers');
    openAddPaperModal();
  });
  document.getElementById('quickAddNoticeBtn')?.addEventListener('click', () => {
    window.switchAdminTab('tab-notices');
  });

  // Initial Load of all Data
  loadAllAdminData();
});

// Refresh functions for individual tabs
function refreshActiveTabData(tabId) {
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
}

function loadAllAdminData() {
  renderOverviewStats();
  renderStudentsTable();
  renderNotesTable();
  renderPapersTable();
  renderNoticesManager();
  renderInquiriesTable();
  renderTestsTable();
  renderAttendanceTable();
  renderDoubtsManager();
  renderReceiptsTable();
  renderTimetableManager();
  renderToppersManager();
  renderWhatsAppStudentOptions();
  setupEventListeners();
}

// -------------------------------------------------------------
// 1. OVERVIEW STATS & PREVIEWS
// -------------------------------------------------------------
function renderOverviewStats() {
  const students = AcademyDB.getStudents();
  const notes = AcademyDB.getNotes();
  const papers = AcademyDB.getPapers() || [];
  const notices = AcademyDB.getNotices();
  const inquiries = AcademyDB.getInquiries();
  const timetable = AcademyDB.getTimetable() || [];

  const totalStuEl = document.getElementById('statTotalStudents');
  if (totalStuEl) totalStuEl.textContent = students.length;

  const totalNotesEl = document.getElementById('statTotalNotes');
  if (totalNotesEl) totalNotesEl.textContent = notes.length;

  const paperStatEl = document.getElementById('statTotalPapers');
  if (paperStatEl) paperStatEl.textContent = papers.length;

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
  const students = AcademyDB.getStudents();
  const search = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
  const standardFilter = document.getElementById('studentStandardFilter')?.value || 'all';
  const feeFilter = document.getElementById('studentFeeFilter')?.value || 'all';

  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filtered = students.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search) ||
      s.id.toLowerCase().includes(search) ||
      s.phone.includes(search) ||
      (s.parentName && s.parentName.toLowerCase().includes(search));

    const matchStandard = standardFilter === 'all' || s.standard.includes(standardFilter) || s.standard === standardFilter;
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
  document.getElementById('studentModalTitle').textContent = 'Add New Enrolled Student';
  document.getElementById('modalStudentId').value = '';
  document.getElementById('modalStudentName').value = '';
  document.getElementById('modalStudentStandard').value = 'Standard 10 (SSC)';
  document.getElementById('modalStudentPhone').value = '';
  document.getElementById('modalStudentPin').value = 'student123';
  document.getElementById('modalParentName').value = '';
  document.getElementById('modalParentPhone').value = '';
  document.getElementById('modalFeeStatus').value = 'Paid';

  document.getElementById('studentModal').style.display = 'flex';
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
    renderStudentsTable();
    renderOverviewStats();
    renderWhatsAppStudentOptions();
  }
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

    return `
      <tr>
        <td><strong>${p.title}</strong><br><small style="color:var(--text-muted);">${p.subject}</small></td>
        <td><span class="badge badge-standard">${p.standard}</span></td>
        <td><strong>${p.year || 'Board Paper'}</strong></td>
        <td><span class="paper-type-pill ${typeBadge}">📝 ${p.type}</span></td>
        <td>${p.marks || '40 Marks'}</td>
        <td>
          <span class="badge badge-category">📄 ${p.fileType || 'PDF'}</span><br>
          <span class="badge ${p.solutionAvailable ? 'badge-paid' : 'badge-regular'}" style="margin-top:4px;display:inline-block;">${p.solutionAvailable ? '🔑 Key Attached' : '⏳ Solution Pending'}</span>
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
// 8. ATTENDANCE TRACKER
// -------------------------------------------------------------
function renderAttendanceTable() {
  const attendance = AcademyDB.getAttendance() || [];
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  if (attendance.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No attendance records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = attendance.map(a => {
    let pctBadge = 'badge-paid';
    if (a.percentage < 75) pctBadge = 'badge-pending';
    else if (a.percentage < 90) pctBadge = 'badge-regular';

    return `
      <tr>
        <td><code>${a.studentId}</code></td>
        <td><strong>${a.studentName}</strong></td>
        <td><span class="badge badge-standard">${a.standard}</span></td>
        <td>${a.totalLectures}</td>
        <td><strong>${a.attendedLectures}</strong></td>
        <td><span class="badge ${pctBadge}">${a.percentage}%</span></td>
        <td><small>${a.lastMarkedDate || '—'}</small></td>
        <td>
          <button class="btn-toggle-fee ${a.status === 'Present' ? 'fee-paid' : 'fee-pending'}" onclick="toggleTodayAttendance('${a.studentId}')">
            ${a.status === 'Present' ? '✅ Present' : '❌ Absent'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleTodayAttendance = function(studentId) {
  let attendance = AcademyDB.getAttendance() || [];
  const record = attendance.find(a => a.studentId === studentId);
  if (record) {
    if (record.status === 'Present') {
      record.status = 'Absent';
      record.attendedLectures = Math.max(0, record.attendedLectures - 1);
    } else {
      record.status = 'Present';
      record.attendedLectures += 1;
    }
    record.percentage = Math.round((record.attendedLectures / record.totalLectures) * 1000) / 10;
    record.lastMarkedDate = new Date().toISOString().split('T')[0];
    AcademyDB.saveAttendance(attendance);
    renderAttendanceTable();
  }
};

window.openAttendanceModal = function() {
  const students = AcademyDB.getStudents();
  const container = document.getElementById('attendanceChecklistContainer');
  const dateInput = document.getElementById('attendanceDateInput');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  if (container) {
    container.innerHTML = students.map(s => `
      <div class="attendance-check-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
        <div>
          <strong>${s.name}</strong> <small>(${s.standard})</small>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" class="att-check" data-id="${s.id}" checked> Present
        </label>
      </div>
    `).join('');
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
  document.getElementById('openAddStudentModalBtn')?.addEventListener('click', openAddStudentModal);
  document.getElementById('openAddNoteModalBtn')?.addEventListener('click', openAddNoteModal);
  document.getElementById('openAddPaperModalBtn')?.addEventListener('click', openAddPaperModal);
  document.getElementById('openAddTestBtn')?.addEventListener('click', openAddTestModal);
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
        }
      } else {
        // Create new student
        const newId = 'STU-' + (1000 + students.length + 1);
        students.push({
          id: newId,
          name: document.getElementById('modalStudentName').value.trim(),
          standard: document.getElementById('modalStudentStandard').value,
          phone: document.getElementById('modalStudentPhone').value.trim(),
          pin: document.getElementById('modalStudentPin').value.trim() || 'student123',
          parentName: document.getElementById('modalParentName').value.trim(),
          parentPhone: document.getElementById('modalParentPhone').value.trim(),
          feeStatus: document.getElementById('modalFeeStatus').value,
          enrolledDate: new Date().toISOString().split('T')[0],
          role: 'student'
        });
      }

      AcademyDB.saveStudents(students);
      closeStudentModal();
      renderStudentsTable();
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
        description: document.getElementById('modalPaperDesc').value.trim()
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

      const receipts = AcademyDB.getReceipts() || [];
      const newReceiptNo = 'REC-2026-' + (100 + receipts.length + 1);

      receipts.push({
        receiptNo: newReceiptNo,
        studentId,
        studentName,
        parentName,
        standard,
        amount: Number(document.getElementById('modalReceiptAmount').value),
        term: document.getElementById('modalReceiptTerm').value.trim(),
        paymentMode: document.getElementById('modalReceiptMode').value,
        transactionId: document.getElementById('modalReceiptTxnId').value.trim() || `UPI/${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        collectedBy: 'Nikhillesh Bhatkar'
      });

      AcademyDB.saveReceipts(receipts);

      // Also mark student fee status as Paid
      const students = AcademyDB.getStudents();
      const stu = students.find(s => s.id === studentId);
      if (stu) {
        stu.feeStatus = 'Paid';
        AcademyDB.saveStudents(students);
        renderStudentsTable();
      }

      document.getElementById('receiptModal').style.display = 'none';
      receiptForm.reset();
      renderReceiptsTable();
      alert('✅ Fee receipt generated & student status marked Paid!');
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
    const checkboxes = document.querySelectorAll('.att-check');
    const topic = document.getElementById('attendanceTopicInput')?.value.trim() || 'Regular Class Session';
    const date = document.getElementById('attendanceDateInput')?.value || new Date().toISOString().split('T')[0];

    let attendance = AcademyDB.getAttendance() || [];

    checkboxes.forEach(cb => {
      const stuId = cb.getAttribute('data-id');
      const isPresent = cb.checked;
      let rec = attendance.find(a => a.studentId === stuId);
      if (rec) {
        rec.totalLectures += 1;
        if (isPresent) rec.attendedLectures += 1;
        rec.percentage = Math.round((rec.attendedLectures / rec.totalLectures) * 1000) / 10;
        rec.lastMarkedDate = date;
        rec.status = isPresent ? 'Present' : 'Absent';
        if (!rec.history) rec.history = [];
        rec.history.unshift({ date, status: isPresent ? 'Present' : 'Absent', topic });
      }
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

  // Export CSV Buttons
  document.getElementById('exportStudentsCsvBtn')?.addEventListener('click', () => {
    const students = AcademyDB.getStudents();
    let csv = 'Student ID,Name,Standard,Phone,PIN,Parent Name,Parent Phone,Fee Status,Enrolled Date\n';
    students.forEach(s => {
      csv += `"${s.id}","${s.name}","${s.standard}","${s.phone}","${s.pin}","${s.parentName || ''}","${s.parentPhone || ''}","${s.feeStatus}","${s.enrolledDate || ''}"\n`;
    });
    downloadFile(csv, 'academy_students.csv', 'text/csv');
  });

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
