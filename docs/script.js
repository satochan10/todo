// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyC9-N7Z3iOizGqfPVj0-Nz2BH_neZBoPMA",
  authDomain: "todo-app-1fac3.firebaseapp.com",
  projectId: "todo-app-1fac3",
  storageBucket: "todo-app-1fac3.firebasestorage.app",
  messagingSenderId: "469318704626",
  appId: "1:469318704626:web:948d455d9d32fb29285f6b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let todos = [];
let currentFilter = 'all';
let isLoading = false;
let isAdminMode = false;
let points = 0;
let draggedTodo = null;

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const countDisplay = document.getElementById('count');
const filterBtns = document.querySelectorAll('.filter-btn');
const settingsBtn = document.getElementById('settingsBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const passwordOkBtn = document.getElementById('passwordOkBtn');
const passwordCancelBtn = document.getElementById('passwordCancelBtn');
const pointsCount = document.getElementById('pointsCount');
const reloadBtn = document.getElementById('reloadBtn');

// ポイント管理
function loadPoints() {
  db.collection('app').doc('settings').onSnapshot(doc => {
    if (doc.exists) {
      points = doc.data().points || 0;
    } else {
      points = 0;
    }
    updatePointsDisplay();
    console.log('ポイント読み込み:', points);
  }, error => {
    console.error('ポイント読み込みエラー:', error);
    points = 0;
    updatePointsDisplay();
  });
}

async function addPoints(amount = 1) {
  points += amount;
  updatePointsDisplay();
  await savePoints();
}

function updatePointsDisplay() {
  pointsCount.textContent = points;
}

async function savePoints() {
  try {
    await db.collection('app').doc('settings').set({
      points: points
    }, { merge: true });
    console.log('ポイント保存成功:', points);
  } catch (error) {
    console.error('ポイント保存エラー:', error);
  }
}

// Firestoreからリアルタイム読み込み
function loadTodos() {
  isLoading = true;
  db.collection('todos').orderBy('order', 'asc').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    todos = [];
    snapshot.forEach(doc => {
      todos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    isLoading = false;
    renderTodos();
  });
}

// Firestoreに保存
async function saveTodo(todo) {
  await db.collection('todos').add({
    text: todo.text,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Todoを追加
async function addTodo() {
  const text = todoInput.value.trim();
  if (text === '') {
    alert('やることを入力してね！ ✏️');
    return;
  }

  try {
    await db.collection('todos').add({
      text: text,
      completed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    todoInput.value = '';
    todoInput.focus();
  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました');
  }
}

// Todoを削除
async function deleteTodo(id) {
  console.log('Delete called with id:', id);
  try {
    await db.collection('todos').doc(id).delete();
    console.log('Deleted successfully');
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました: ' + error.message);
  }
}

// Todoの完了状態を切り替え
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    // 既に完了しているタスクは状態を変更できない
    if (todo.completed) {
      return;
    }

    try {
      await db.collection('todos').doc(id).update({
        completed: true
      });
      // 完了したらポイント加算
      addPoints(1);
    } catch (error) {
      console.error('更新エラー:', error);
    }
  }
}

// 完了したTodoをすべて削除
async function clearCompleted() {
  const completedTodos = todos.filter(t => t.completed);
  if (completedTodos.length === 0) {
    alert('完了したタスクはないよ！ 🎉');
    return;
  }

  if (confirm(`${completedTodos.length}個の完了したタスクを削除してもいい？`)) {
    try {
      for (const todo of completedTodos) {
        await db.collection('todos').doc(todo.id).delete();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }
}

// Todoを表示
function renderTodos() {
  todoList.innerHTML = '';

  let filteredTodos = todos;

  if (currentFilter === 'active') {
    filteredTodos = todos.filter(todo => !todo.completed);
  } else if (currentFilter === 'completed') {
    filteredTodos = todos.filter(todo => todo.completed);
  }

  if (filteredTodos.length === 0 && todos.length > 0) {
    todoList.style.display = 'none';
    emptyState.classList.add('show');
  } else {
    emptyState.classList.remove('show');
    todoList.style.display = 'block';
  }

  filteredTodos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.draggable = true;
    li.dataset.todoId = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    if (todo.completed) {
      checkbox.disabled = true;
    }
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-delete';
    if (!isAdminMode) {
      deleteBtn.classList.add('hidden');
    }
    deleteBtn.textContent = '🗑️ 削除';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);

    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    todoList.appendChild(li);
  });

  updateCount();
}

// 残りのタスク数を更新
function updateCount() {
  const activeCount = todos.filter(todo => !todo.completed).length;
  countDisplay.textContent = activeCount;
}

// ドラッグアンドドロップ
function handleDragStart(e) {
  draggedTodo = todos.find(t => t.id === this.dataset.todoId);
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.style.borderTop = '3px solid #ff6b9d';
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const targetTodo = todos.find(t => t.id === this.dataset.todoId);

  if (draggedTodo && targetTodo && draggedTodo.id !== targetTodo.id) {
    const draggedIndex = todos.indexOf(draggedTodo);
    const targetIndex = todos.indexOf(targetTodo);

    todos.splice(draggedIndex, 1);
    todos.splice(targetIndex, 0, draggedTodo);

    saveTodosOrder();
    renderTodos();
  }
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  this.style.borderTop = 'none';
  document.querySelectorAll('.todo-item').forEach(item => {
    item.style.borderTop = 'none';
  });
}

async function saveTodosOrder() {
  const batch = db.batch();
  todos.forEach((todo, index) => {
    const docRef = db.collection('todos').doc(todo.id);
    batch.update(docRef, { order: index });
  });
  await batch.commit().catch(error => {
    console.error('順序保存エラー:', error);
  });
}

// XSS対策
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// パスワードモーダル
function showPasswordModal() {
  passwordModal.classList.add('show');
  passwordInput.value = '';
  passwordInput.focus();
}

function hidePasswordModal() {
  passwordModal.classList.remove('show');
}

function checkPassword() {
  const password = passwordInput.value;
  if (password === '2019') {
    isAdminMode = true;
    hidePasswordModal();
    renderTodos();
    alert('管理者モードに切り替わりました');
  } else {
    alert('パスワードが間違っています');
    passwordInput.value = '';
    passwordInput.focus();
  }
}

// イベントリスナー
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

settingsBtn.addEventListener('click', showPasswordModal);
passwordOkBtn.addEventListener('click', checkPassword);
passwordCancelBtn.addEventListener('click', hidePasswordModal);
passwordInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    checkPassword();
  }
});

reloadBtn.addEventListener('click', () => {
  location.reload();
});

// グローバルスコープに関数を登録（HTMLから呼び出せるように）
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadPoints();
  loadTodos();
});
