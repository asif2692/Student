// app-common.js - Shared utilities (English)
if(window.firebaseConfig){
  try{ firebase.initializeApp(window.firebaseConfig); }catch(e){ console.warn('firebase init skipped (already initialized)'); }
} else {
  console.warn('firebaseConfig not found - create firebase-config.js with your config.');
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Get user profile document (users collection)
async function getProfile(uid){
  try{
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  }catch(e){
    console.error(e);
    return null;
  }
}

// Ensure user is signed in, otherwise redirect to login
function requireAuth(){
  return new Promise((resolve)=>{
    auth.onAuthStateChanged(async user => {
      if(!user){ window.location.href = 'index.html'; resolve(null); return; }
      user.profile = await getProfile(user.uid);
      resolve(user);
    });
  });
}

function signOutAndGoLogin(){ auth.signOut().then(()=> window.location.href='index.html'); }

// CSV export helper
function exportTableToCSV(filename, rows){
  // rows: array of arrays
  const csvContent = rows.map(r=> r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// PDF export (client-side) using jsPDF (dynamically loaded)
async function exportRowsToPDF(filename, rows, columns){
  try{
    if(typeof window.jspdf === 'undefined'){
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(s);
      await new Promise(res => s.onload = res);
    }
    const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : (window.jspdf ? window.jspdf : null);
    if(!jsPDF){ alert('PDF export library not available.'); return; }
    const doc = new jsPDF.jsPDF({ unit: 'pt', format: 'a4' });
    let y = 40;
    doc.setFontSize(14);
    doc.text('Student Report', 40, 30);
    doc.setFontSize(10);
    columns.forEach((c,i)=> doc.text(String(c), 40 + i*90, y));
    y += 20;
    rows.forEach(row => {
      row.forEach((cell,i)=> doc.text(String(cell||''), 40 + i*90, y));
      y += 18;
      if(y > 750){ doc.addPage(); y = 40; }
    });
    doc.save(filename);
  }catch(e){
    console.error(e);
    alert('PDF export failed: ' + e.message);
  }
}

// simple safe escape for insertion into text
function esc(s){ return String(s||''); }

// ✅ NEW: Generate unique student ID
function generateUniqueStudentId() {
  const prefix = 'STU';
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${randomNum}`;
}

// ✅ NEW: Check if student ID exists
async function checkStudentIdExists(studentId) {
  try {
    const snapshot = await db.collection('students')
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking student ID:', error);
    return false;
  }
}

// ✅ NEW: Load courses with error handling
async function loadCourses(status = 'active') {
  try {
    let query = db.collection('courses');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.orderBy('name').get();
    const courses = [];
    
    snapshot.forEach(doc => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return courses;
  } catch (error) {
    console.error('Error loading courses:', error);
    throw error;
  }
}

// ✅ NEW: Navigation helper for role-based access
function applyRoleNavbar(user) {
  const adminTab = document.getElementById('adminTab');
  if (adminTab && user.profile?.role !== 'admin') {
    adminTab.style.display = 'none';
  }
}