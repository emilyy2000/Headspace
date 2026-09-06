const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const cash = value => `${value < 0 ? '-' : ''}£${Math.abs(value).toFixed(2)}`;
const getData = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

const cleared = localStorage.getItem('pocketCleared') === 'true';

let transactions = getData('pocketTx', []);
let payments = getData('pocketPayments', []);
let goals = getData('pocketGoals', []);
let debts = getData('pocketDebts', []);
let weeklyBudget = Number(localStorage.getItem('pocketWeeklyBudget')) || 0;
let startingBalance = 0;
let startingIncome = 0;
let startingOut = 0;
let activityType = 'expense';
let editIndex = null;
let deleteIndex = null;
let depositIndex = null;
let editPaymentIndex = null;
let editGoalIndex = null;
let editDebtIndex = null;

function saveAll() {
  localStorage.setItem('pocketTx', JSON.stringify(transactions));
  localStorage.setItem('pocketPayments', JSON.stringify(payments));
  localStorage.setItem('pocketGoals', JSON.stringify(goals));
  localStorage.setItem('pocketDebts', JSON.stringify(debts));
  localStorage.setItem('pocketWeeklyBudget', String(weeklyBudget));
}

function subscriptionReserve() {
  return payments.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {day:'numeric', month:'short'});
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(element.timer);
  element.timer = setTimeout(() => element.classList.remove('show'), 2300);
}

function transactionHTML(item, index, editable = false) {
  return `<div class="transaction">
    <i class="icon">${item.icon || '•'}</i>
    <div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.cat)} · ${item.date}</small></div>
    ${editable ? `<div class="activityActions"><button data-edit-activity="${index}" aria-label="Edit ${escapeHTML(item.name)}">Edit</button></div>` : ''}
    <strong class="${item.amount > 0 ? 'in' : ''}">${item.amount > 0 ? '+' : ''}${cash(item.amount)}</strong>
  </div>`;
}

function paymentHTML(item, wide = false, index = 0) {
  return `<div class="${wide ? 'wide' : 'payment'}"><i class="logo">${escapeHTML(item.logo || item.name[0])}</i><div><strong>${escapeHTML(item.name)}</strong><small>${dateLabel(item.date)}</small><small class="frequency">${escapeHTML(item.frequency)}</small></div>${wide ? `<div class="cardActions"><button class="manageEdit" data-edit-payment="${index}">Edit</button></div>` : ''}<strong>${cash(item.amount)}</strong></div>`;
}

function goalHTML(item, wide = false, index = 0) {
  const percent = Math.min(100, item.saved / item.target * 100);
  return `<div class="${wide ? 'wide' : 'goal'}">${wide ? '<i class="logo">◇</i>' : ''}<div><div class="goalHead"><span><strong>${escapeHTML(item.name)}</strong><small>${Math.round(percent)}% saved</small></span><strong>${cash(item.saved)} / ${cash(item.target)}</strong></div><div class="track"><i style="width:${percent}%"></i></div></div>${wide ? `<div class="cardActions"><button class="addToGoal" data-deposit="${index}" ${percent >= 100 ? 'disabled' : ''}>${percent >= 100 ? 'Goal reached' : '＋ Add money'}</button><button class="manageEdit" data-edit-goal="${index}">Edit</button></div>` : ''}</div>`;
}

function renderActivity() {
  $('#recent').innerHTML = transactions.slice(0, 4).map((item, index) => transactionHTML(item, index)).join('');
  $('#all').innerHTML = transactions.length
    ? transactions.map((item, index) => transactionHTML(item, index, true)).join('')
    : '<div class="emptyState">No activity yet. Add money earned or a purchase to begin.</div>';
  $$('[data-edit-activity]').forEach(button => button.onclick = () => openActivityModal(transactions[+button.dataset.editActivity].amount > 0 ? 'income' : 'expense', +button.dataset.editActivity));
}

function renderPayments() {
  $('#upcoming').innerHTML = payments.slice(0, 2).map(item => paymentHTML(item)).join('') || '<p class="noDebtPreview">No upcoming payments.</p>';
  $('#paymentCards').innerHTML = payments.length ? payments.map((item,index) => paymentHTML(item, true, index)).join('') : '<div class="emptyState">No payments added yet.</div>';
  $('#home .due strong').textContent = cash(payments.reduce((total, item) => total + item.amount, 0));
  $('nav [data-page="payments"] b').textContent = payments.length;
  $$('[data-edit-payment]').forEach(button => button.onclick = () => openPaymentEditor(+button.dataset.editPayment));
}

function renderGoals() {
  $('#goalList').innerHTML = goals.slice(0, 1).map(item => goalHTML(item)).join('') || '<p class="noDebtPreview">No savings goal yet.</p>';
  $('#goalCards').innerHTML = goals.length ? goals.map((item, index) => goalHTML(item, true, index)).join('') : '<div class="emptyState">No goals yet. Create one to start saving.</div>';
  $$('[data-deposit]').forEach(button => button.onclick = () => openDeposit(+button.dataset.deposit));
  $$('[data-edit-goal]').forEach(button => button.onclick = () => openGoalEditor(+button.dataset.editGoal));
}

function renderDebts() {
  const outstanding = debts.filter(item => !item.done);
  $('#debtTotal').textContent = cash(outstanding.reduce((total, item) => total + item.amount, 0));
  $('#debtBadge').textContent = outstanding.length;
  $('#debtProgress').textContent = outstanding.length ? `${outstanding.length} ${outstanding.length === 1 ? 'item' : 'items'} left` : 'Nothing outstanding';
  $('#debtList').innerHTML = debts.length ? debts.map((item, index) => `<article class="debtItem ${item.done ? 'done' : ''}"><input class="debtCheck" type="checkbox" data-debt="${index}" ${item.done ? 'checked' : ''} aria-label="Mark payment to ${escapeHTML(item.person)} as repaid"><div class="debtInfo"><h3>${escapeHTML(item.person)}</h3><p>${escapeHTML(item.reason)}</p></div><div class="debtMeta"><strong>${cash(item.amount)}</strong><small>${item.done ? 'Paid' : `Due ${dateLabel(item.date)}`}</small></div><button class="manageEdit" data-edit-debt="${index}">Edit</button></article>`).join('') : '<div class="emptyState">Nothing to pay back right now. Nice!</div>';
  $('#upcomingDebts').innerHTML = outstanding.length ? outstanding.slice(0, 2).map(item => `<div class="debtPreview"><i>↗</i><div><strong>${escapeHTML(item.person)}</strong><small>${escapeHTML(item.reason)} · ${dateLabel(item.date)}</small></div><strong>${cash(item.amount)}</strong></div>`).join('') : '<p class="noDebtPreview">Nothing to pay back — you’re all clear.</p>';
  $$('[data-debt]').forEach(box => box.onchange = () => {
    const debt = debts[+box.dataset.debt];
    if (box.checked && !debt.done) {
      debt.done = true;
      debt.paidTransactionId = `payback-${Date.now()}-${box.dataset.debt}`;
      transactions.unshift({id:debt.paidTransactionId, name:`Paid back ${debt.person}`, cat:'Paid back', amount:-Number(debt.amount), date:'Just now', icon:'✓'});
    } else if (!box.checked && debt.done) {
      debt.done = false;
      transactions = transactions.filter(item => item.id !== debt.paidTransactionId);
      delete debt.paidTransactionId;
    }
    saveAll(); render();
    toast(box.checked ? 'Paid back and balance updated' : 'Pay-back returned to your checklist');
  });
  $$('[data-edit-debt]').forEach(button => button.onclick = () => openDebtEditor(+button.dataset.editDebt));
}

function renderBudgetAndBalance() {
  const income = transactions.filter(item => item.amount > 0).reduce((total, item) => total + item.amount, 0);
  const moneyOut = -transactions.filter(item => item.amount < 0).reduce((total, item) => total + item.amount, 0) + subscriptionReserve();
  const weeklySpent = -transactions.filter(item => item.amount < 0).reduce((total, item) => total + item.amount, 0) + subscriptionReserve();
  const left = Math.max(0, weeklyBudget - weeklySpent);
  const percent = weeklyBudget ? Math.min(100, weeklySpent / weeklyBudget * 100) : 0;
  $('#balance').textContent = cash(startingBalance + income - moneyOut);
  $('#moneyIn').textContent = cash(startingIncome + income);
  $('#moneyOut').textContent = cash(startingOut + moneyOut);
  $('#spent').textContent = cash(weeklySpent);
  $('#weeklyLimit').textContent = cash(weeklyBudget);
  $('#left').textContent = cash(left);
  $('#ring').style.background = `conic-gradient(var(--green) ${percent}%,#e8efec 0)`;
  $('#status').textContent = !weeklyBudget ? 'Set budget' : percent > 100 ? 'Over budget' : percent > 90 ? 'Slow down' : percent > 70 ? 'Nearly there' : 'On track';
  const daysLeft = Math.max(1, 7 - new Date().getDay());
  $('#tip').textContent = !weeklyBudget ? 'Set a weekly budget to start planning your spending.' : left ? `Spend up to ${cash(left / daysLeft)} a day to stay on budget and save the rest.` : 'Your weekly budget is used up. Try a no-spend day.';
  const names = ['Food & drink','Fun','Shopping','Transport','Other'];
  const colors = ['#3d5a80','#ee6c4d','#98c1d9','#293241','#7b8fa8'];
  const values = names.map(name => -transactions.filter(item => item.cat === name && item.amount < 0).reduce((total, item) => total + item.amount, 0));
  const spentCategories = names.map((name,index) => ({name, value:values[index], color:colors[index]})).filter(item => item.value > 0);
  const totalSpent = spentCategories.reduce((total,item) => total + item.value, 0);
  $('#total').textContent = cash(totalSpent);
  $('#cats').innerHTML = spentCategories.length ? spentCategories.map(item => `<div class="cat"><i style="background:${item.color}"></i><span>${item.name}</span><strong>${cash(item.value)}</strong></div>`).join('') : '<p class="noDebtPreview">No spending recorded yet.</p>';
  $('#home .donut').style.background = spentCategories.length ? `conic-gradient(${spentCategories.map((item,index) => { const start = spentCategories.slice(0,index).reduce((sum,part) => sum + part.value,0) / totalSpent * 100; const end = (start + item.value / totalSpent * 100); return `${item.color} ${start}% ${end}%`; }).join(',')})` : '#98c1d9';
}

function render() {
  renderBudgetAndBalance();
  renderActivity();
  renderPayments();
  renderGoals();
  renderDebts();
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); document.body.style.overflow = ''; }

function setActivityType(type) {
  activityType = type;
  $$('[data-type]').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  $('#modal h2').textContent = editIndex === null ? (type === 'income' ? 'Add money earned' : 'Add a purchase') : (type === 'income' ? 'Edit money earned' : 'Edit purchase');
  $('#noteLabel').textContent = type === 'income' ? 'WHERE DID IT COME FROM?' : 'WHAT WAS IT FOR?';
  $('#note').placeholder = type === 'income' ? 'e.g. Chores or weekend job' : 'e.g. Cinema ticket';
  $('#categoryField').classList.toggle('hiddenField', type === 'income');
}

function openActivityModal(type, index = null) {
  editIndex = index;
  const item = index === null ? null : transactions[index];
  $('#amount').value = item ? Math.abs(item.amount) : '';
  $('#note').value = item ? item.name : '';
  $('#category').value = item && item.amount < 0 ? item.cat : 'Fun';
  $('#saveActivity').textContent = item ? 'Save changes' : 'Save to Pocket';
  $('#deleteFromEdit').classList.toggle('hidden', item === null);
  setActivityType(type);
  openModal('modal');
  setTimeout(() => $('#amount').focus(), 50);
}

function openDeleteActivity(index) {
  deleteIndex = index;
  $('#deleteActivityName').textContent = transactions[index].name;
  openModal('deleteActivityModal');
}

function openDeposit(index) {
  depositIndex = index;
  $('#depositGoalName').textContent = goals[index].name;
  $('#depositAmount').value = '';
  openModal('depositModal');
}

function openPaymentEditor(index) {
  editPaymentIndex = index;
  const item = payments[index];
  $('#paymentName').value = item.name;
  $('#paymentAmount').value = item.amount;
  $('#paymentDate').value = item.date;
  $('#paymentFrequency').value = item.frequency;
  $('#paymentModal h2').textContent = 'Edit upcoming payment';
  $('#savePayment').textContent = 'Save changes';
  openModal('paymentModal');
}

function openGoalEditor(index) {
  editGoalIndex = index;
  const item = goals[index];
  $('#goalName').value = item.name;
  $('#goalTarget').value = item.target;
  $('#goalSaved').value = item.saved;
  $('#goalModal h2').textContent = 'Edit savings goal';
  $('#saveGoal').textContent = 'Save changes';
  openModal('goalModal');
}

function openDebtEditor(index) {
  editDebtIndex = index;
  const item = debts[index];
  $('#debtPerson').value = item.person;
  $('#debtReason').value = item.reason;
  $('#debtAmount').value = item.amount;
  $('#debtDate').value = item.date;
  $('#debtModal h2').textContent = 'Edit pay-back item';
  $('#saveDebt').textContent = 'Save changes';
  openModal('debtModal');
}

function showPage(name) {
  $$('.page').forEach(page => page.classList.remove('active'));
  $(`#${name}`).classList.add('active');
  $('main').classList.toggle('subpage', name !== 'home');
  $$('nav button').forEach(button => button.classList.toggle('active', button.dataset.page === name));
  $('#title').textContent = {home:'Good morning',activity:'Your money activity',payments:'Upcoming payments',payback:'Your pay-back checklist',goals:'Your savings goals'}[name];
  $('aside').classList.remove('open');
  window.scrollTo(0,0);
}

$$('nav button').forEach(button => button.onclick = () => showPage(button.dataset.page));
$$('[data-go]').forEach(button => button.onclick = () => showPage(button.dataset.go));
$$('[data-type]').forEach(button => button.onclick = () => setActivityType(button.dataset.type));
$$('[data-close]').forEach(button => button.onclick = () => closeModal(button.dataset.close));
$$('.backdrop').forEach(backdrop => backdrop.onclick = event => { if (event.target === backdrop) closeModal(backdrop.id); });

$('#addIncome').onclick = () => openActivityModal('income');
$('#quickAdd').onclick = $('#addExpense').onclick = () => openActivityModal('expense');
$('#modal .close').onclick = () => closeModal('modal');
$('#setBudget').onclick = () => { $('#budgetAmount').value = weeklyBudget; openModal('budgetModal'); };
$('#deleteFromEdit').onclick = () => { const index = editIndex; closeModal('modal'); openDeleteActivity(index); };
$('#newPayment').onclick = () => { editPaymentIndex=null; $('#paymentForm').reset(); const date = new Date(); date.setDate(date.getDate()+1); $('#paymentDate').value = date.toISOString().slice(0,10); $('#paymentModal h2').textContent='Add upcoming payment'; $('#savePayment').textContent='Save payment'; openModal('paymentModal'); };
$('#newGoal').onclick = () => { editGoalIndex=null; $('#goalForm').reset(); $('#goalModal h2').textContent='Create a goal'; $('#saveGoal').textContent='Create goal'; openModal('goalModal'); };
$('#newDebt').onclick = () => { editDebtIndex=null; $('#debtForm').reset(); const date = new Date(); date.setDate(date.getDate()+7); $('#debtDate').value = date.toISOString().slice(0,10); $('#debtModal h2').textContent='What do you need to pay back?'; $('#saveDebt').textContent='Add to checklist'; openModal('debtModal'); };

$('#modal form').onsubmit = event => {
  event.preventDefault();
  const amount = Number($('#amount').value);
  const existing = editIndex === null ? null : transactions[editIndex];
  const item = {name:$('#note').value.trim(), cat:activityType === 'income' ? 'Money in' : $('#category').value, amount:activityType === 'income' ? amount : -amount, date:existing?.date || 'Just now', icon:activityType === 'income' ? '✦' : existing?.icon || '•'};
  if (editIndex === null) transactions.unshift(item); else transactions[editIndex] = item;
  saveAll(); closeModal('modal'); render();
  toast(editIndex === null ? 'Activity added' : 'Activity updated');
  editIndex = null;
};

$('#confirmActivityDelete').onclick = () => {
  transactions.splice(deleteIndex, 1);
  saveAll(); closeModal('deleteActivityModal'); render(); showPage('activity');
  toast('Activity deleted and totals updated');
  deleteIndex = null;
};

$('#budgetForm').onsubmit = event => {
  event.preventDefault();
  weeklyBudget = Number($('#budgetAmount').value);
  saveAll(); closeModal('budgetModal'); render();
  toast('Weekly budget updated');
};

$('#paymentForm').onsubmit = event => {
  event.preventDefault();
  const name = $('#paymentName').value.trim();
  const item = {name, date:$('#paymentDate').value, amount:Number($('#paymentAmount').value), frequency:$('#paymentFrequency').value, logo:name[0].toUpperCase()};
  if (editPaymentIndex === null) payments.push(item); else payments[editPaymentIndex] = item;
  payments.sort((a,b) => a.date.localeCompare(b.date));
  saveAll(); event.target.reset(); closeModal('paymentModal'); render(); showPage('payments'); toast(editPaymentIndex === null ? 'Payment added — no surprises' : 'Payment updated'); editPaymentIndex=null;
};

$('#goalForm').onsubmit = event => {
  event.preventDefault();
  const saved = Number($('#goalSaved').value), target = Number($('#goalTarget').value);
  if (saved > target) return toast('Saved amount cannot be above the target');
  const item = {name:$('#goalName').value.trim(), saved, target};
  if (editGoalIndex === null) goals.push(item); else goals[editGoalIndex] = item;
  saveAll(); event.target.reset(); closeModal('goalModal'); render(); showPage('goals'); toast(editGoalIndex === null ? 'New goal created' : 'Goal updated'); editGoalIndex=null;
};

$('#depositForm').onsubmit = event => {
  event.preventDefault();
  const goal = goals[depositIndex];
  const added = Math.min(Number($('#depositAmount').value), goal.target-goal.saved);
  goal.saved += added;
  transactions.unshift({name:`${goal.name} savings`, cat:'Savings goal', amount:-added, date:'Just now', icon:'◇'});
  saveAll(); closeModal('depositModal'); render();
  toast(goal.saved >= goal.target ? 'Goal reached — amazing!' : 'Money added to your goal');
};

$('#debtForm').onsubmit = event => {
  event.preventDefault();
  const existing = editDebtIndex === null ? null : debts[editDebtIndex];
  const item = {person:$('#debtPerson').value.trim(), reason:$('#debtReason').value.trim(), amount:Number($('#debtAmount').value), date:$('#debtDate').value, done:existing?.done || false};
  if (existing?.done && existing.paidTransactionId) {
    const paidTransaction = transactions.find(transaction => transaction.id === existing.paidTransactionId);
    if (paidTransaction) { paidTransaction.amount = -item.amount; paidTransaction.name = `Paid back ${item.person}`; }
  }
  if (editDebtIndex === null) debts.push(item); else debts[editDebtIndex] = item;
  debts.sort((a,b) => a.date.localeCompare(b.date));
  saveAll(); event.target.reset(); closeModal('debtModal'); render(); showPage('payback'); toast(editDebtIndex === null ? 'Added to your pay-back checklist' : 'Pay-back item updated'); editDebtIndex=null;
};

$('#deleteData').onclick = () => openModal('deleteModal');
$('#confirmDelete').onclick = () => {
  ['pocketTx','pocketPayments','pocketGoals','pocketDebts','pocketWeeklyBudget'].forEach(key => localStorage.removeItem(key));
  localStorage.setItem('pocketCleared','true');
  transactions=[]; payments=[]; goals=[]; debts=[]; weeklyBudget=60;
  startingBalance=0; startingIncome=0; startingOut=0;
  closeModal('deleteModal'); render(); showPage('home'); toast('Your Pocket data has been deleted');
};

$('#menu').onclick = () => $('aside').classList.toggle('open');
$('#nudge button').onclick = () => $('#nudge').remove();
document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.backdrop').forEach(item => closeModal(item.id)); });
render();
