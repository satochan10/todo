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
let belongings = [];
let morningTasks = [];
let nightTasks = [];

// キャラクター進化ステージ（海の生き物）
const characters = [
  '🐚', '🦀', '🦞', '🐙', '🦑', '🐠', '🐡', '🦈', '🐳', '👑',
  '🌊', '🐟', '🦐', '🦪', '🪼', '🧜', '💎', '⭐', '🌟', '✨',
  '🎆', '🎇', '🌅', '🏆', '🔱', '⚜️', '🦑', '🐠', '🦈', '🚀'
];

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
const pointsBadge = document.getElementById('pointsBadge');
const rewardsModal = document.getElementById('rewardsModal');
const rewardsCloseBtn = document.getElementById('rewardsCloseBtn');
const currentPointsDisplay = document.getElementById('currentPoints');
const youtubeReward = document.getElementById('youtubeReward');
const moneyReward = document.getElementById('moneyReward');
const confirmRewardModal = document.getElementById('confirmRewardModal');
const confirmRewardOkBtn = document.getElementById('confirmRewardOkBtn');
const confirmRewardCancelBtn = document.getElementById('confirmRewardCancelBtn');
const confirmRewardText = document.getElementById('confirmRewardText');
const belongingsBtn = document.getElementById('belongingsBtn');
const belongingsModal = document.getElementById('belongingsModal');
const belongingsList = document.getElementById('belongingsList');
const belongingsInput = document.getElementById('belongingsInput');
const addBelongingBtn = document.getElementById('addBelongingBtn');
const belongingsInputSection = document.getElementById('belongingsInputSection');
const clearAllBelongingsBtn = document.getElementById('clearAllBelongingsBtn');
const belongingsCloseBtn = document.getElementById('belongingsCloseBtn');
const belongingsCheckMessage = document.getElementById('belongingsCheckMessage');
const belongingsCount = document.getElementById('belongingsCount');
const quickTaskButtons = document.getElementById('quickTaskButtons');
const morningTaskBtn = document.getElementById('morningTaskBtn');
const nightTaskBtn = document.getElementById('nightTaskBtn');
const editTasksBtn = document.getElementById('editTasksBtn');
const editTasksModal = document.getElementById('editTasksModal');
const editTasksCloseBtn = document.getElementById('editTasksCloseBtn');
const morningTasksList = document.getElementById('morningTasksList');
const nightTasksList = document.getElementById('nightTasksList');
const morningTaskInput = document.getElementById('morningTaskInput');
const nightTaskInput = document.getElementById('nightTaskInput');
const addMorningTaskBtn = document.getElementById('addMorningTaskBtn');
const addNightTaskBtn = document.getElementById('addNightTaskBtn');

// 朝・夜のタスク管理
function loadQuickTasks() {
  db.collection('app').doc('settings').onSnapshot(doc => {
    if (doc.exists) {
      morningTasks = doc.data().morningTasks || [];
      nightTasks = doc.data().nightTasks || [];
    } else {
      morningTasks = [];
      nightTasks = [];
    }
    renderQuickTasksList();
  }, error => {
    console.error('クイックタスク読み込みエラー:', error);
  });
}

async function saveQuickTasks() {
  try {
    await db.collection('app').doc('settings').set({
      morningTasks: morningTasks,
      nightTasks: nightTasks
    }, { merge: true });
    console.log('クイックタスク保存成功');
  } catch (error) {
    console.error('クイックタスク保存エラー:', error);
  }
}

async function addQuickTask(taskType, taskText) {
  if (taskText.trim() === '') return;

  if (taskType === 'morning') {
    morningTasks.push(taskText);
  } else {
    nightTasks.push(taskText);
  }

  await saveQuickTasks();
  renderQuickTasksList();
}

async function removeQuickTask(taskType, index) {
  if (taskType === 'morning') {
    morningTasks.splice(index, 1);
  } else {
    nightTasks.splice(index, 1);
  }

  await saveQuickTasks();
  renderQuickTasksList();
}

function renderQuickTasksList() {
  morningTasksList.innerHTML = '';
  nightTasksList.innerHTML = '';

  morningTasks.forEach((task, index) => {
    const div = document.createElement('div');
    div.className = 'quick-task-item';
    div.innerHTML = `
      <span>${task}</span>
      <button class="quick-task-delete" data-type="morning" data-index="${index}">🗑️</button>
    `;
    morningTasksList.appendChild(div);
  });

  nightTasks.forEach((task, index) => {
    const div = document.createElement('div');
    div.className = 'quick-task-item';
    div.innerHTML = `
      <span>${task}</span>
      <button class="quick-task-delete" data-type="night" data-index="${index}">🗑️</button>
    `;
    nightTasksList.appendChild(div);
  });

  document.querySelectorAll('.quick-task-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskType = e.target.dataset.type;
      const index = parseInt(e.target.dataset.index);
      removeQuickTask(taskType, index);
    });
  });
}

async function addQuickTasksToTodo(taskType) {
  const tasks = taskType === 'morning' ? morningTasks : nightTasks;

  if (tasks.length === 0) {
    alert(`${taskType === 'morning' ? '朝' : '夜'}のタスクが設定されていません！`);
    return;
  }

  try {
    const maxOrder = todos.reduce((max, t) => Math.max(max, t.order ?? 0), 0);

    for (let i = 0; i < tasks.length; i++) {
      await db.collection('todos').add({
        text: tasks[i],
        completed: false,
        order: maxOrder + i + 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    alert(`${taskType === 'morning' ? '朝' : '夜'}のタスク ${tasks.length} 個を追加しました！`);
  } catch (error) {
    console.error('タスク追加エラー:', error);
    alert('タスクの追加に失敗しました');
  }
}

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
  const multiplier = isMorningBonus() ? 2 : 1;
  points += amount * multiplier;
  updatePointsDisplay();
  await savePoints();
}

function isMorningBonus() {
  const hour = new Date().getHours();
  return hour >= 18 && hour < 21;
}

function updatePointsDisplay() {
  const level = Math.floor(points / 5);
  const character = characters[Math.min(level, characters.length - 1)];
  pointsCount.textContent = points;
  const characterSpan = document.getElementById('characterSpan');
  if (characterSpan) {
    characterSpan.textContent = character;
  }
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
  db.collection('todos').onSnapshot(snapshot => {
    todos = [];
    snapshot.forEach(doc => {
      todos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    // orderフィールドでソート、なければcreatedAtでソート
    todos.sort((a, b) => {
      const aHasOrder = a.order !== undefined;
      const bHasOrder = b.order !== undefined;

      if (aHasOrder && bHasOrder) {
        return a.order - b.order;
      } else if (aHasOrder) {
        return 1; // aはorderがあるので後ろ
      } else if (bHasOrder) {
        return -1; // bはorderがあるので後ろ
      }
      return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
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
    const maxOrder = todos.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    await db.collection('todos').add({
      text: text,
      completed: false,
      order: maxOrder + 1,
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
    li.addEventListener('touchstart', handleTouchStart);
    li.addEventListener('touchmove', handleTouchMove);
    li.addEventListener('touchend', handleTouchEnd);

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

// タッチイベント対応
let touchItem = null;
function handleTouchStart(e) {
  touchItem = this;
  draggedTodo = todos.find(t => t.id === this.dataset.todoId);
  this.style.opacity = '0.5';
}

function handleTouchMove(e) {
  if (!touchItem) return;
  e.preventDefault();

  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  if (element && element.classList.contains('todo-item') && element !== touchItem) {
    document.querySelectorAll('.todo-item').forEach(item => {
      item.style.borderTop = 'none';
    });
    element.style.borderTop = '3px solid #ff6b9d';
  }
}

function handleTouchEnd(e) {
  if (!touchItem) return;

  const touch = e.changedTouches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  if (element && element.classList.contains('todo-item') && element !== touchItem) {
    const targetTodo = todos.find(t => t.id === element.dataset.todoId);

    if (draggedTodo && targetTodo && draggedTodo.id !== targetTodo.id) {
      const draggedIndex = todos.indexOf(draggedTodo);
      const targetIndex = todos.indexOf(targetTodo);

      todos.splice(draggedIndex, 1);
      todos.splice(targetIndex, 0, draggedTodo);

      saveTodosOrder();
      renderTodos();
    }
  }

  touchItem.style.opacity = '1';
  touchItem.style.borderTop = 'none';
  document.querySelectorAll('.todo-item').forEach(item => {
    item.style.borderTop = 'none';
  });
  touchItem = null;
  draggedTodo = null;
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

// 持ち物チェック関連関数
function loadBelongings() {
  db.collection('belongings').onSnapshot(snapshot => {
    belongings = [];
    snapshot.forEach(doc => {
      belongings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    belongings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderBelongings();
  });
}

async function addBelonging() {
  const text = belongingsInput.value.trim();
  if (text === '') {
    alert('もちものを入力してね！');
    return;
  }

  try {
    const maxOrder = belongings.reduce((max, b) => Math.max(max, b.order ?? 0), 0);
    await db.collection('belongings').add({
      text: text,
      checked: false,
      order: maxOrder + 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    belongingsInput.value = '';
    belongingsInput.focus();
  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました');
  }
}

async function toggleBelonging(id) {
  const belonging = belongings.find(b => b.id === id);
  if (belonging) {
    try {
      await db.collection('belongings').doc(id).update({
        checked: !belonging.checked
      });
    } catch (error) {
      console.error('更新エラー:', error);
    }
  }
}

async function deleteBelonging(id) {
  try {
    await db.collection('belongings').doc(id).delete();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました: ' + error.message);
  }
}

async function clearAllBelongings() {
  const checkedBelongings = belongings.filter(b => b.checked);
  if (checkedBelongings.length === 0) {
    alert('チェック済みのもちものはないよ！');
    return;
  }

  try {
    const batch = db.batch();
    checkedBelongings.forEach(belonging => {
      const docRef = db.collection('belongings').doc(belonging.id);
      batch.update(docRef, { checked: false });
    });
    await batch.commit();
  } catch (error) {
    console.error('更新エラー:', error);
  }
}

function renderBelongings() {
  belongingsList.innerHTML = '';

  if (belongings.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = '#999';
    emptyMsg.textContent = 'もちものを追加してね！';
    belongingsList.appendChild(emptyMsg);
    belongingsCount.style.display = 'none';
    belongingsCheckMessage.style.display = 'none';
    return;
  }

  const checkedCount = belongings.filter(b => b.checked).length;
  const totalCount = belongings.length;
  const uncheckedCount = totalCount - checkedCount;

  belongings.forEach(belonging => {
    const div = document.createElement('div');
    div.className = `belonging-item ${belonging.checked ? 'checked' : ''}`;
    div.dataset.belongingId = belonging.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'belonging-checkbox';
    checkbox.checked = belonging.checked;
    checkbox.addEventListener('change', e => {
      e.stopPropagation();
      toggleBelonging(belonging.id);
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'belonging-text';
    textSpan.textContent = belonging.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'belonging-delete';
    deleteBtn.textContent = '🗑️ 削除';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteBelonging(belonging.id);
    });

    if (!isAdminMode) {
      deleteBtn.style.display = 'none';
      belongingsInputSection.style.display = 'none';
    } else {
      deleteBtn.style.display = 'block';
      belongingsInputSection.style.display = 'flex';
    }

    // 行クリックでチェック状態をトグル
    div.addEventListener('click', () => toggleBelonging(belonging.id));

    div.appendChild(checkbox);
    div.appendChild(textSpan);
    div.appendChild(deleteBtn);
    belongingsList.appendChild(div);
  });

  // カウント表示
  belongingsCount.style.display = 'block';
  belongingsCount.innerHTML = `<span class="count-text">チェック: ${checkedCount}/${totalCount} (残り: ${uncheckedCount}個)</span>`;

  // 全部チェック時のメッセージ
  if (uncheckedCount === 0 && totalCount > 0) {
    belongingsCheckMessage.style.display = 'block';
    const messages = [
      '🎉 やった！すべてチェック完了！楽しいおでかけだね！',
      '✨ 完璧だ！これで安心だね～♪',
      '🌟 すごい！全部バッチリだ！行ってきます！',
      '🚀 完璧！もう完全に準備できたね！',
      '💫 わあ！全部そろった！さあ出発だ！'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    belongingsCheckMessage.textContent = randomMessage;
  } else {
    belongingsCheckMessage.style.display = 'none';
  }
}

function showBelongingsModal() {
  belongingsModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  if (isAdminMode) {
    belongingsModal.classList.add('admin-mode');
  } else {
    belongingsModal.classList.remove('admin-mode');
  }
  renderBelongings();
}

function hideBelongingsModal() {
  belongingsModal.classList.remove('show');
  document.body.style.overflow = '';
}

function showEditTasksModal() {
  editTasksModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  renderQuickTasksList();
}

function hideEditTasksModal() {
  editTasksModal.classList.remove('show');
  document.body.style.overflow = '';
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
    document.body.classList.add('admin-mode');
    quickTaskButtons.style.display = 'flex';
    renderTodos();
    renderBelongings();
  } else {
    alert('パスワードが間違っています');
    passwordInput.value = '';
    passwordInput.focus();
  }
}

// 特典モーダル
function showRewardsModal() {
  currentPointsDisplay.innerHTML = '現在のポイント: <strong>' + points + '</strong>P';
  rewardsModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function hideRewardsModal() {
  rewardsModal.classList.remove('show');
  document.body.style.overflow = '';
}

// 特典確認モーダル
function showConfirmRewardModal(rewardName, rewardCost) {
  if (points < rewardCost) {
    alert('ポイントが足りません！\n必要: ' + rewardCost + 'P, 現在: ' + points + 'P');
    return;
  }
  confirmRewardText.textContent = rewardName + 'に' + rewardCost + 'Pを使いますか？';
  confirmRewardModal.classList.add('show');
  confirmRewardModal.dataset.cost = rewardCost;
  document.body.style.overflow = 'hidden';
}

function hideConfirmRewardModal() {
  confirmRewardModal.classList.remove('show');
  document.body.style.overflow = '';
}

async function confirmUseReward() {
  const cost = parseInt(confirmRewardModal.dataset.cost);
  points -= cost;
  await savePoints();
  updatePointsDisplay();
  hideConfirmRewardModal();
  hideRewardsModal();
  alert('特典を獲得しました！');
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

pointsBadge.addEventListener('click', showRewardsModal);
rewardsCloseBtn.addEventListener('click', hideRewardsModal);
rewardsModal.addEventListener('click', e => {
  if (e.target === rewardsModal) {
    hideRewardsModal();
  }
});

youtubeReward.addEventListener('click', () => {
  showConfirmRewardModal('YouTube 30分', 10);
});

moneyReward.addEventListener('click', () => {
  showConfirmRewardModal('100円', 20);
});

confirmRewardOkBtn.addEventListener('click', confirmUseReward);
confirmRewardCancelBtn.addEventListener('click', hideConfirmRewardModal);
confirmRewardModal.addEventListener('click', e => {
  if (e.target === confirmRewardModal) {
    hideConfirmRewardModal();
  }
});

// バクバクチャレンジ
const BAKUBAKU_LIMIT_SEC = 20 * 60;
const bakubakuModal = document.getElementById('bakubakuModal');
const bakubakuTimer = document.getElementById('bakubakuTimer');
const bakubakuResult = document.getElementById('bakubakuResult');
const bakubakuStartBtn = document.getElementById('bakubakuStartBtn');
const bakubakuStopBtn = document.getElementById('bakubakuStopBtn');
const bakubakuPauseBtn = document.getElementById('bakubakuPauseBtn');
const bakubakuCloseBtn = document.getElementById('bakubakuCloseBtn');
const bakubakuQuitBtn = document.getElementById('bakubakuQuitBtn');
let bakubakuStartTime = null;
// いちじていし するまでに すすんだ じかん（ミリ秒）
let bakubakuElapsedBeforeMs = 0;
let bakubakuPaused = false;
let bakubakuInterval = null;

function getBakubakuElapsedSec() {
  const runningMs = bakubakuStartTime ? Date.now() - bakubakuStartTime : 0;
  return Math.floor((bakubakuElapsedBeforeMs + runningMs) / 1000);
}

function formatBakubakuTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function getBakubakuPoints(elapsedSec) {
  if (elapsedSec <= 10 * 60) return 20;
  if (elapsedSec <= 12 * 60) return 16;
  if (elapsedSec <= 14 * 60) return 12;
  if (elapsedSec <= 16 * 60) return 8;
  if (elapsedSec <= 18 * 60) return 4;
  if (elapsedSec < 20 * 60) return 2;
  return 0;
}

// いまもらえるポイントの行をめだたせる
function highlightBakubakuRule(elapsedSec) {
  const rows = document.querySelectorAll('#bakubakuRules li');
  let found = false;
  rows.forEach(row => {
    const isCurrent = elapsedSec !== null && !found && elapsedSec <= Number(row.dataset.max);
    if (isCurrent) found = true;
    row.classList.toggle('current', isCurrent);
    row.classList.toggle('passed', elapsedSec !== null && elapsedSec > Number(row.dataset.max));
  });
}

function resetBakubaku() {
  clearInterval(bakubakuInterval);
  bakubakuInterval = null;
  bakubakuStartTime = null;
  bakubakuElapsedBeforeMs = 0;
  bakubakuPaused = false;
  bakubakuTimer.textContent = formatBakubakuTime(BAKUBAKU_LIMIT_SEC);
  bakubakuTimer.classList.remove('running', 'paused', 'finished');
  bakubakuResult.style.display = 'none';
  bakubakuStartBtn.disabled = false;
  bakubakuStartBtn.textContent = '▶️ スタート';
  bakubakuStopBtn.disabled = true;
  bakubakuPauseBtn.disabled = true;
  bakubakuCloseBtn.disabled = false;
  bakubakuQuitBtn.disabled = true;
  highlightBakubakuRule(null);
}

function tickBakubaku() {
  const elapsedSec = getBakubakuElapsedSec();
  const remaining = Math.max(BAKUBAKU_LIMIT_SEC - elapsedSec, 0);
  bakubakuTimer.textContent = formatBakubakuTime(remaining);
  highlightBakubakuRule(elapsedSec);
  if (remaining === 0) {
    finishBakubaku(BAKUBAKU_LIMIT_SEC);
  }
}

function startBakubaku() {
  if (bakubakuPaused) {
    resumeBakubaku();
    return;
  }
  resetBakubaku();
  bakubakuStartTime = Date.now();
  bakubakuTimer.classList.add('running');
  bakubakuStartBtn.disabled = true;
  bakubakuPauseBtn.disabled = false;
  bakubakuStopBtn.disabled = false;
  // ストップするまでは とじられない
  bakubakuCloseBtn.disabled = true;
  // とちゅうでおわる は チャレンジちゅうだけ つかえる
  bakubakuQuitBtn.disabled = false;
  bakubakuInterval = setInterval(tickBakubaku, 250);
}

function pauseBakubaku() {
  if (!bakubakuStartTime) return;
  bakubakuElapsedBeforeMs += Date.now() - bakubakuStartTime;
  bakubakuStartTime = null;
  bakubakuPaused = true;
  clearInterval(bakubakuInterval);
  bakubakuInterval = null;
  bakubakuTimer.classList.remove('running');
  bakubakuTimer.classList.add('paused');
  bakubakuStartBtn.disabled = false;
  bakubakuStartBtn.textContent = '▶️ さいかい';
  bakubakuPauseBtn.disabled = true;
  // いちじていし ちゅうは ストップ（ポイントもらう）できない
  bakubakuStopBtn.disabled = true;
}

function resumeBakubaku() {
  bakubakuPaused = false;
  bakubakuStartTime = Date.now();
  bakubakuTimer.classList.remove('paused');
  bakubakuTimer.classList.add('running');
  bakubakuStartBtn.disabled = true;
  bakubakuStartBtn.textContent = '▶️ スタート';
  bakubakuPauseBtn.disabled = false;
  bakubakuStopBtn.disabled = false;
  bakubakuInterval = setInterval(tickBakubaku, 250);
}

async function finishBakubaku(elapsedSec) {
  clearInterval(bakubakuInterval);
  bakubakuInterval = null;
  bakubakuStartTime = null;
  bakubakuElapsedBeforeMs = 0;
  bakubakuPaused = false;
  bakubakuTimer.classList.remove('running', 'paused');
  bakubakuTimer.classList.add('finished');
  bakubakuStartBtn.disabled = false;
  bakubakuStartBtn.textContent = '🔁 もういちど';
  bakubakuStopBtn.disabled = true;
  bakubakuPauseBtn.disabled = true;
  bakubakuCloseBtn.disabled = false;
  bakubakuQuitBtn.disabled = true;

  highlightBakubakuRule(elapsedSec);
  const earned = getBakubakuPoints(elapsedSec);
  bakubakuResult.style.display = 'block';
  bakubakuResult.classList.remove('celebrate');
  if (earned > 0) {
    const cheers = {
      20: ['すごすぎる！！', 'ロケットなみ！！', 'てんさい！！'],
      16: ['はやーい！！', 'かっこいい！！', 'やるね！！'],
      12: ['いいかんじ！！', 'がんばった！！', 'ナイス！！'],
      8: ['よくできました！', 'えらい！！', 'がんばったね！'],
      4: ['さいごまで がんばった！', 'えらいぞ！'],
      2: ['ぎりぎり セーフ！', 'よく がんばった！']
    }[earned];
    const cheer = cheers[Math.floor(Math.random() * cheers.length)];
    bakubakuResult.innerHTML =
      '<div class="result-title">🎉 やったー！ 🎉</div>' +
      '<div class="result-cheer">' + cheer + '</div>' +
      '<div class="result-points">⭐ ' + earned + 'P ゲット！ ⭐</div>' +
      '<div class="result-time">' + formatBakubakuElapsed(elapsedSec) + ' で たべおわったよ！</div>';
    // アニメーションを毎回やりなおす
    void bakubakuResult.offsetWidth;
    bakubakuResult.classList.add('celebrate');
    launchBakubakuConfetti();
    points += earned;
    updatePointsDisplay();
    await savePoints();
  } else {
    bakubakuResult.innerHTML =
      '<div class="result-title">⏰ じかん ぎれ…</div>' +
      '<div class="result-time">つぎは もっと はやく たべてみよう！</div>';
  }
}

function formatBakubakuElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return s + 'びょう';
  if (s === 0) return m + 'ふん';
  return m + 'ふん ' + s + 'びょう';
}

// かみふぶきを ふらせる
function launchBakubakuConfetti() {
  const items = ['🎉', '⭐', '✨', '🎊', '🌟', '💖', '🍚'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('span');
    piece.className = 'bakubaku-confetti';
    piece.textContent = items[Math.floor(Math.random() * items.length)];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.fontSize = (1.2 + Math.random() * 1.6) + 'em';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    bakubakuModal.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

// ストップ：「食べ終わりましたか？」をかくにんしてから おわる
const bakubakuStopConfirmModal = document.getElementById('bakubakuStopConfirmModal');

function stopBakubaku() {
  if (!bakubakuStartTime) return;
  // かくにんちゅうは タイマーを とめておく
  pauseBakubaku();
  bakubakuStopConfirmModal.classList.add('show');
}

document.getElementById('bakubakuStopOkBtn').addEventListener('click', () => {
  bakubakuStopConfirmModal.classList.remove('show');
  const elapsedSec = getBakubakuElapsedSec();
  finishBakubaku(Math.min(elapsedSec, BAKUBAKU_LIMIT_SEC));
});
document.getElementById('bakubakuStopCancelBtn').addEventListener('click', () => {
  bakubakuStopConfirmModal.classList.remove('show');
  resumeBakubaku();
});

function showBakubakuModal() {
  resetBakubaku();
  bakubakuModal.classList.add('show');
  // 前回スクロールした位置が残らないように いちばん上に もどす
  bakubakuModal.querySelector('.bakubaku-content').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function hideBakubakuModal() {
  resetBakubaku();
  hideHelpModal();
  bakubakuModal.classList.remove('show');
  document.body.style.overflow = '';
}

document.getElementById('bakubakuBtn').addEventListener('click', showBakubakuModal);
bakubakuStartBtn.addEventListener('click', startBakubaku);
bakubakuPauseBtn.addEventListener('click', pauseBakubaku);
bakubakuStopBtn.addEventListener('click', stopBakubaku);
bakubakuCloseBtn.addEventListener('click', hideBakubakuModal);
// とちゅうでおわる：かくにんしてから、ポイントは はいらずに とじる
const bakubakuQuitConfirmModal = document.getElementById('bakubakuQuitConfirmModal');
// かくにんちゅうは タイマーを とめておく
let bakubakuPausedByQuitConfirm = false;
bakubakuQuitBtn.addEventListener('click', () => {
  bakubakuPausedByQuitConfirm = !!bakubakuStartTime;
  if (bakubakuPausedByQuitConfirm) {
    pauseBakubaku();
  }
  bakubakuQuitConfirmModal.classList.add('show');
});
document.getElementById('bakubakuQuitOkBtn').addEventListener('click', () => {
  bakubakuQuitConfirmModal.classList.remove('show');
  bakubakuPausedByQuitConfirm = false;
  hideBakubakuModal();
});
document.getElementById('bakubakuQuitCancelBtn').addEventListener('click', () => {
  bakubakuQuitConfirmModal.classList.remove('show');
  // うごいていたときだけ さいかい（もともと いちじていし ちゅうなら そのまま）
  if (bakubakuPausedByQuitConfirm) {
    resumeBakubaku();
  }
  bakubakuPausedByQuitConfirm = false;
});
// 背景タップでは閉じない・iOSで背景がスクロールしないようにする（ダイアログの中はスクロールできる）
bakubakuModal.addEventListener('touchmove', e => {
  if (!e.target.closest('.bakubaku-content')) {
    e.preventDefault();
  }
}, { passive: false });

// ヘルプ動画
// ちろぴの（https://www.youtube.com/@tiropino）のアップロード動画プレイリスト
// チャンネルID「UC...」の先頭を「UU」に変えたものがアップロード動画のプレイリストID
const HELP_PLAYLIST_ID = 'UUBliDcAvBxDy-RWoKl5ZHSA';
const helpModal = document.getElementById('helpModal');
const helpVideoWrapper = document.getElementById('helpVideoWrapper');
let helpPlayer = null;

function showHelpModal() {
  helpModal.classList.add('show');
  helpVideoWrapper.innerHTML = '<div id="helpVideo"></div>';
  if (!window.YT || !YT.Player) {
    // APIが読みこめなかったときは さいしんの動画から ふつうに再生する
    helpVideoWrapper.innerHTML = '<iframe title="ヘルプ動画" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/videoseries?list=' + HELP_PLAYLIST_ID + '&rel=0&playsinline=1"></iframe>';
    return;
  }
  // プレイリストの中から ランダムに 1本えらんで 再生する
  let picked = false;
  const playRandom = () => {
    if (picked || !helpPlayer) return;
    const list = helpPlayer.getPlaylist();
    if (!list || list.length === 0) return;
    picked = true;
    helpPlayer.playVideoAt(Math.floor(Math.random() * list.length));
  };
  helpPlayer = new YT.Player('helpVideo', {
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      listType: 'playlist',
      list: HELP_PLAYLIST_ID,
      rel: 0,
      playsinline: 1
    },
    events: {
      onReady: playRandom,
      // onReadyの時点で プレイリストが まだ とれないことがあるので ここでも ためす
      onStateChange: playRandom
    }
  });
}

function hideHelpModal() {
  // プレイヤーを けして 再生を止める
  if (helpPlayer) {
    helpPlayer.destroy();
    helpPlayer = null;
  }
  helpVideoWrapper.innerHTML = '';
  helpModal.classList.remove('show');
  // 次に開いたときは まんなかに もどす
  helpContent.classList.remove('dragged');
  helpContent.style.left = '';
  helpContent.style.top = '';
}

// ヘルプは ポイントを つかって みる
const HELP_COST = 5;
const helpConfirmModal = document.getElementById('helpConfirmModal');
const helpConfirmMessage = document.getElementById('helpConfirmMessage');
const helpConfirmOkBtn = document.getElementById('helpConfirmOkBtn');
const helpConfirmCancelBtn = document.getElementById('helpConfirmCancelBtn');

document.getElementById('helpBtn').addEventListener('click', () => {
  if (points >= HELP_COST) {
    helpConfirmMessage.innerHTML = HELP_COST + 'Pつかって<br>youtubeをみますか？';
    helpConfirmOkBtn.style.display = '';
    helpConfirmCancelBtn.textContent = 'いいえ';
  } else {
    helpConfirmMessage.innerHTML = 'ポイントがたりないよ<br>（' + HELP_COST + 'P ひつよう・いま ' + points + 'P）';
    helpConfirmOkBtn.style.display = 'none';
    helpConfirmCancelBtn.textContent = 'とじる';
  }
  helpConfirmModal.classList.add('show');
});
helpConfirmOkBtn.addEventListener('click', async () => {
  helpConfirmModal.classList.remove('show');
  if (points < HELP_COST) return;
  points -= HELP_COST;
  updatePointsDisplay();
  showHelpModal();
  await savePoints();
});
helpConfirmCancelBtn.addEventListener('click', () => {
  helpConfirmModal.classList.remove('show');
});
document.getElementById('helpCloseBtn').addEventListener('click', hideHelpModal);

// ヘルプダイアログは タイトルを つかんで うごかせる（マウス・タッチ両対応）
const helpContent = helpModal.querySelector('.help-content');
const helpDragHandle = document.getElementById('helpDragHandle');
let helpDragOffsetX = 0;
let helpDragOffsetY = 0;

function moveHelpContent(left, top) {
  // タイトルが がめんの そとに でないようにする
  const handleHeight = helpDragHandle.offsetHeight;
  const maxLeft = window.innerWidth - helpContent.offsetWidth;
  const maxTop = window.innerHeight - handleHeight;
  helpContent.style.left = Math.min(Math.max(left, Math.min(0, maxLeft)), Math.max(0, maxLeft)) + 'px';
  helpContent.style.top = Math.min(Math.max(top, 0), Math.max(0, maxTop)) + 'px';
}

helpDragHandle.addEventListener('pointerdown', e => {
  const rect = helpContent.getBoundingClientRect();
  helpDragOffsetX = e.clientX - rect.left;
  helpDragOffsetY = e.clientY - rect.top;
  helpContent.classList.add('dragged');
  moveHelpContent(rect.left, rect.top);
  // 動画の上に ゆびが のっても ドラッグが とぎれないようにする
  helpDragHandle.setPointerCapture(e.pointerId);
  e.preventDefault();
});
helpDragHandle.addEventListener('pointermove', e => {
  if (!helpDragHandle.hasPointerCapture(e.pointerId)) return;
  moveHelpContent(e.clientX - helpDragOffsetX, e.clientY - helpDragOffsetY);
});

reloadBtn.addEventListener('click', () => {
  location.reload();
});

belongingsBtn.addEventListener('click', showBelongingsModal);
belongingsCloseBtn.addEventListener('click', hideBelongingsModal);
belongingsModal.addEventListener('click', e => {
  if (e.target === belongingsModal) {
    hideBelongingsModal();
  }
});
clearAllBelongingsBtn.addEventListener('click', clearAllBelongings);
addBelongingBtn.addEventListener('click', addBelonging);
belongingsInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addBelonging();
  }
});

morningTaskBtn.addEventListener('click', () => {
  addQuickTasksToTodo('morning');
});

nightTaskBtn.addEventListener('click', () => {
  addQuickTasksToTodo('night');
});

editTasksBtn.addEventListener('click', showEditTasksModal);
editTasksCloseBtn.addEventListener('click', hideEditTasksModal);
editTasksModal.addEventListener('click', e => {
  if (e.target === editTasksModal) {
    hideEditTasksModal();
  }
});

addMorningTaskBtn.addEventListener('click', () => {
  addQuickTask('morning', morningTaskInput.value);
  morningTaskInput.value = '';
  morningTaskInput.focus();
});

addNightTaskBtn.addEventListener('click', () => {
  addQuickTask('night', nightTaskInput.value);
  nightTaskInput.value = '';
  nightTaskInput.focus();
});

morningTaskInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addQuickTask('morning', morningTaskInput.value);
    morningTaskInput.value = '';
  }
});

nightTaskInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addQuickTask('night', nightTaskInput.value);
    nightTaskInput.value = '';
  }
});

// グローバルスコープに関数を登録（HTMLから呼び出せるように）
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;

function updateMorningBonusDisplay() {
  const morningBonusEl = document.getElementById('morningBonus');
  if (morningBonusEl) {
    if (isMorningBonus()) {
      morningBonusEl.style.display = 'block';
    } else {
      morningBonusEl.style.display = 'none';
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadPoints();
  loadTodos();
  loadBelongings();
  loadQuickTasks();
  updateMorningBonusDisplay();
  // 毎分チェックして、ボーナス表示を更新
  setInterval(updateMorningBonusDisplay, 60000);
});
