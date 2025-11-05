// Initialize Firebase (expects firebase-config.js to set window.firebaseConfig)
if(!window.firebaseConfig){
  console.warn('firebaseConfig not found. Please create firebase-config.js and paste your config.');
} else {
  firebase.initializeApp(window.firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// UI elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userEmail = document.getElementById('userEmail');

// Auth form toggles
showRegisterBtn.onclick = () => { document.getElementById('loginForm').classList.add('hidden'); document.getElementById('registerForm').classList.remove('hidden'); };
showLoginBtn.onclick = () => { document.getElementById('registerForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); };

// Register
registerBtn.onclick = async () => {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if(!name||!email||!password){alert('Name Field Fill');return}
  try{
    const userCred = await auth.createUserWithEmailAndPassword(email,password);
    const uid = userCred.user.uid;
    // store profile in users collection
    await db.collection('users').doc(uid).set({ name, email, role: 'student', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    alert('رجسٹریشن کامیاب');
  }catch(err){alert('غلطی: '+err.message)}
}

// Login
loginBtn.onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try{
    await auth.signInWithEmailAndPassword(email,password);
  }catch(err){alert('لاگ ان میں مسئلہ: '+err.message)}
}

// Sign out
signOutBtn.onclick = () => auth.signOut();

// Listen auth state
auth.onAuthStateChanged(user => {
  if(user){
    userEmail.textContent = user.email;
    signOutBtn.classList.remove('hidden');
    document.getElementById('authCard').classList.add('hidden');
    document.getElementById('addStudentCard').classList.remove('hidden');
    loadStudents();
  } else {
    userEmail.textContent = 'لاگ ان نہیں';
    signOutBtn.classList.add('hidden');
    document.getElementById('authCard').classList.remove('hidden');
    document.getElementById('addStudentCard').classList.remove('hidden');
    document.getElementById('studentsTbody').innerHTML = '';
  }
});

// Add student + upload photo
document.getElementById('addStudentBtn').onclick = async () => {
  const studentId = document.getElementById('stuStudentId').value.trim();
  const name = document.getElementById('stuName').value.trim();
  const father = document.getElementById('stuFather').value.trim();
  const email = document.getElementById('stuEmail').value.trim();
  const phone = document.getElementById('stuPhone').value.trim();
  const batch = document.getElementById('stuBatch').value.trim();
  const campus = document.getElementById('stuCampus').value;
  const photoFile = document.getElementById('stuPhoto').files[0];
  if(!studentId||!name){ alert('StudentID اور نام ضروری ہیں'); return }
  const statusEl = document.getElementById('addStatus');
  statusEl.textContent = 'جمع کر رہے ہیں...';
  try{
    let photoUrl = '';
    if(photoFile){
      const storageRef = storage.ref().child('students/'+studentId+'-'+Date.now());
      const snap = await storageRef.put(photoFile);
      photoUrl = await snap.ref.getDownloadURL();
    }
    await db.collection('students').add({ studentId, name, fatherName:father, email, phone, batch, campusId: campus, photoUrl, status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    statusEl.textContent = 'Add Studeant۔';
    // clear form
    document.getElementById('stuStudentId').value=''; document.getElementById('stuName').value=''; document.getElementById('stuFather').value=''; document.getElementById('stuEmail').value=''; document.getElementById('stuPhone').value=''; document.getElementById('stuBatch').value=''; document.getElementById('stuPhoto').value='';
    loadStudents();
  }catch(err){statusEl.textContent='غلطی: '+err.message}
}

// Load students (simple list)
async function loadStudents(){
  const tbody = document.getElementById('studentsTbody');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Looding</td></tr>';
  try{
    const snapshot = await db.collection('students').orderBy('createdAt','desc').limit(100).get();
    if(snapshot.empty){ tbody.innerHTML = '<tr><td colspan="5" class="muted">Student Is not Fount</td></tr>'; return }
    tbody.innerHTML = '';
    snapshot.forEach(doc=>{
      const s = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${s.photoUrl||'https://via.placeholder.com/48'}" class="student-photo"/></td>
        <td>${s.studentId||''}</td>
        <td>${s.name||''}</td>
        <td>${s.campusId||''}</td>
        <td class="actions"><button onclick="viewStudent('${doc.id}')">Viwe</button><button onclick="generateId('${doc.id}')">ID</button><button onclick="deleteStudent('${doc.id}')">حذف</button></td>
      `;
      tbody.appendChild(tr);
    });
  }catch(err){ tbody.innerHTML = '<tr><td colspan="5" class="muted">err '+err.message+'</td></tr>'; }
}

// viewStudent - simple modal replacement: open alert with json
window.viewStudent = async (docId) => {
  const doc = await db.collection('students').doc(docId).get();
  if(!doc.exists){ alert('ریکارڈ نہیں ملا'); return }
  const s = doc.data();
  alert(JSON.stringify(s,null,2));
}

// deleteStudent
window.deleteStudent = async (docId) => {
  if(!confirm('کیا آپ یقینی طور پر حذف کرنا چاہتے ہیں؟')) return;
  try{ await db.collection('students').doc(docId).delete(); alert('ہٹایا گیا'); loadStudents(); }catch(err){alert('غلطی: '+err.message)}
}

// generateId - opens new window with printable card
window.generateId = async (docId) => {
  const doc = await db.collection('students').doc(docId).get();
  if(!doc.exists){ alert('Recode Not fond'); return }
  const s = doc.data();
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>ID - ${s.name}</title><style>body{font-family:Arial;text-align:right;padding:18px} .card{border:2px solid #111;padding:18px;width:340px;border-radius:8px} img{width:80px;height:80px;object-fit:cover;border-radius:6px}</style></head><body><div class="card"><h2>${s.name}</h2><p><strong>StudentID:</strong> ${s.studentId||''}</p><p><strong>کیمپس:</strong> ${s.campusId||''}</p><p><img src="${s.photoUrl||'https://via.placeholder.com/80'}"/></p></div><script>window.print()</script></body></html>`;
  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
}

// Basic delete helper for storage if needed (not used automatically here)
async function deleteStorageFile(url){
  try{
    const ref = storage.refFromURL(url);
    await ref.delete();
  }catch(e){console.warn('storage delete failed',e)}
}

// Reminder in console
console.log('Reminder: paste your firebase config into firebase-config.js. Configure Firestore + Storage rules for RBAC.');
