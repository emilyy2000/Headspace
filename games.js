const $=s=>document.querySelector(s);
const progress={get:(key,fallback=0)=>JSON.parse(localStorage.getItem(`pixel-${key}`)??JSON.stringify(fallback)),set:(key,value)=>localStorage.setItem(`pixel-${key}`,JSON.stringify(value))};
function grantReward(points,win=true){progress.set('points',progress.get('points')+points);if(win)progress.set('wins',progress.get('wins')+1);return ` +${points} points`}

function showGameOver(title,message){
 let modal=$('#game-modal');
 if(!modal){modal=document.createElement('div');modal.id='game-modal';modal.className='game-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.innerHTML='<div class="game-modal-card"><div class="game-modal-icon">★</div><h2></h2><p></p><div class="game-modal-actions"><button type="button">Play again</button><a href="index.html">Return home</a></div></div>';document.body.appendChild(modal);modal.querySelector('button').onclick=()=>location.reload()}
 modal.querySelector('h2').textContent=title;modal.querySelector('p').textContent=message;modal.classList.add('open');modal.querySelector('button').focus();
}

function setupGameControls({points=()=>0,pause=()=>{},resume=()=>{},stop=()=>{}}={}){
 const toolbar=$('.toolbar');if(!toolbar)return;const group=document.createElement('div');group.className='game-controls';group.innerHTML='<button type="button" class="pause-game">Pause</button><button type="button" class="end-game">End</button>';toolbar.appendChild(group);
 const modal=document.createElement('div');modal.className='game-modal control-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');document.body.appendChild(modal);
 function close(){modal.classList.remove('open');resume()}
 group.querySelector('.pause-game').onclick=()=>{pause();modal.innerHTML='<div class="game-modal-card"><div class="game-modal-icon">Ⅱ</div><h2>Game paused</h2><p>Your game is waiting for you.</p><div class="game-modal-actions"><button type="button">Resume</button></div></div>';modal.classList.add('open');modal.querySelector('button').onclick=close;modal.querySelector('button').focus()};
 group.querySelector('.end-game').onclick=()=>{pause();const earned=Math.max(0,Math.floor(points()));modal.innerHTML=`<div class="game-modal-card"><div class="game-modal-icon">?</div><h2>End this game?</h2><p>You will earn <strong>${earned} points</strong> and <strong>0 wins</strong>.</p><div class="game-modal-actions"><button type="button" class="confirm-end">End game</button><button type="button" class="cancel-end">Keep playing</button></div></div>`;modal.classList.add('open');modal.querySelector('.cancel-end').onclick=close;modal.querySelector('.confirm-end').onclick=()=>{stop();modal.remove();if(earned)grantReward(earned,false);showGameOver('Game ended',`You earned ${earned} points · 0 wins`)};modal.querySelector('.cancel-end').focus()};
}

function initSudoku(){
 const puzzles={
  easy:{puzzle:'530070000600195000098000060800060003400803001700020006060000280000419005000080079',solution:'534678912672195348198342567859761423426853791713924856961537284287419635345286179'},
  medium:{puzzle:'000260701680070090190004500820100040004602900050003028009300074040050036703018000',solution:'435269781682571493197834562826195347374682915951743628519326874248957136763418259'},
  hard:{puzzle:'000000907000420180000705026100904000050000040000507009920108000034059000507000000',solution:'483651927659423187271795326168934752795812643342567819926178435834259671517346298'}
 };
 const board=$('#sudoku');let level='easy';document.body.classList.add(`sudoku-${progress.get('sudoku-equipped','classic')}`);
 function load(next){
  level=next;const {puzzle,solution}=puzzles[level];board.innerHTML='';
  document.querySelectorAll('.difficulty-button').forEach(b=>b.classList.toggle('active',b.dataset.level===level));
  $('#status').textContent=`${level[0].toUpperCase()+level.slice(1)} puzzle · Take your time.`;
  puzzle.split('').forEach((n,i)=>{const input=document.createElement('input');input.className='sudoku-cell'+(n!=='0'?' given':'');input.value=n==='0'?'':n;input.readOnly=n!=='0';input.inputMode='numeric';input.maxLength=1;input.setAttribute('aria-label',`Row ${Math.floor(i/9)+1}, column ${i%9+1}`);input.addEventListener('input',()=>{input.value=input.value.replace(/[^1-9]/g,'');check(solution)});board.appendChild(input)});
 }
 function check(solution){const values=[...board.children].map(x=>x.value).join('');if(values.length===81){if(values===solution){$('#status').textContent='You solved it! 🎉';showGameOver('Puzzle solved!',`Great work.${grantReward({easy:20,medium:40,hard:70}[level])}`)}else{$('#status').textContent='Almost — check the red squares.';[...board.children].forEach((x,i)=>x.style.color=x.value!==solution[i]?'#d84d3d':'')}}}
 document.querySelectorAll('.difficulty-button').forEach(b=>b.onclick=()=>load(b.dataset.level));
 $('#reset').onclick=()=>load(level);load(level);setupGameControls({points:()=>Math.round([...board.querySelectorAll('input:not(.given)')].filter(x=>x.value).length*({easy:20,medium:40,hard:70}[level]/50)),stop:()=>board.querySelectorAll('input').forEach(x=>x.disabled=true)});
}

function initMines(){
 const size=9,count=12,board=$('#mines'),flagSkins={classic:'⚑',gem:'◆',star:'★'};let mines=new Set(),open=new Set(),flags=new Set(),ended=false;
 while(mines.size<count)mines.add(Math.floor(Math.random()*size*size));
 function near(i){let a=[];for(let r=-1;r<=1;r++)for(let c=-1;c<=1;c++){let n=i+r*size+c;if(n>=0&&n<size*size&&Math.abs(n%size-i%size)<=1&&n!==i)a.push(n)}return a}
 function reveal(i){if(ended||flags.has(i)||open.has(i))return;open.add(i);const el=board.children[i];el.classList.add('open');if(mines.has(i)){el.textContent='✹';el.classList.add('boom');ended=true;$('#status').textContent='Mine hit — try another board.';mines.forEach(m=>board.children[m].textContent='✹');showGameOver('Mine hit!','That was a close one. Want a fresh board?');return}let n=near(i).filter(x=>mines.has(x)).length;el.textContent=n||'';if(!n)near(i).forEach(reveal);if(open.size===size*size-count){ended=true;$('#status').textContent='Board cleared! 🎉';showGameOver('Board cleared!',`You found every safe square.${grantReward(50)}`)}}
 for(let i=0;i<size*size;i++){let b=document.createElement('button');b.className='mine-cell';b.setAttribute('aria-label',`Cell ${i+1}`);b.onclick=()=>reveal(i);b.oncontextmenu=e=>{e.preventDefault();if(ended||open.has(i))return;flags.has(i)?flags.delete(i):flags.add(i);b.classList.toggle('flagged');b.textContent=flags.has(i)?flagSkins[progress.get('mines-equipped','classic')]:'';$('#status').textContent=`${count-flags.size} mines unflagged`};board.appendChild(b)}
 $('#reset').onclick=()=>location.reload();
 setupGameControls({points:()=>open.size,stop:()=>ended=true});
}

function initBattle(){
 const size=8,ships=[3,3,2,2],player=$('#player-grid'),enemy=$('#enemy-grid'),status=$('#status');document.body.classList.add(`battle-${progress.get('battle-equipped','classic')}`);let over=false,paused=false,turns=new Set();
 function place(){let set=new Set();ships.forEach(len=>{let ok=false;while(!ok){let horiz=Math.random()>.5,r=Math.floor(Math.random()*(horiz?size:size-len+1)),c=Math.floor(Math.random()*(horiz?size-len+1:size));let cells=Array.from({length:len},(_,k)=>(r+(horiz?0:k))*size+c+(horiz?k:0));if(cells.every(x=>!set.has(x))){cells.forEach(x=>set.add(x));ok=true}}});return set}
 const yours=place(),theirs=place();let yourHits=new Set(),theirHits=new Set();
 for(let i=0;i<size*size;i++){let p=document.createElement('button');p.className='battle-cell'+(yours.has(i)?' ship-cell':'');p.disabled=true;player.appendChild(p);let e=document.createElement('button');e.className='battle-cell';e.setAttribute('aria-label',`Target row ${Math.floor(i/size)+1}, column ${i%size+1}`);e.onclick=()=>fire(i,e);enemy.appendChild(e)}
 function fire(i,el){if(over||turns.has(i))return;turns.add(i);if(theirs.has(i)){yourHits.add(i);el.classList.add('hit');el.textContent='×';status.textContent='Hit! Take another shot.'}else{el.classList.add('miss');status.textContent='Miss — they are firing...';setTimeout(enemyTurn,450)}if(yourHits.size===theirs.size)finish('You sank the fleet! 🎉')}
 function enemyTurn(){if(over)return;if(paused){setTimeout(enemyTurn,200);return}let choices=[...Array(size*size).keys()].filter(x=>!document.getElementById('player-grid').children[x].classList.contains('hit')&&!document.getElementById('player-grid').children[x].classList.contains('miss'));let i=choices[Math.floor(Math.random()*choices.length)],el=player.children[i];if(yours.has(i)){theirHits.add(i);el.classList.add('hit');el.textContent='×';status.textContent='They hit your ship. Your turn.'}else{el.classList.add('miss');status.textContent='They missed. Your turn.'}if(theirHits.size===yours.size)finish('Your fleet was sunk. New battle?')}
 function finish(msg){over=true;status.textContent=msg;const won=yourHits.size===theirs.size;showGameOver(won?'Fleet sunk!':'Battle over',won?`You found every enemy ship.${grantReward(60)}`:'Your fleet was sunk this time.')}
 $('#reset').onclick=()=>location.reload();
 setupGameControls({points:()=>yourHits.size*4,pause:()=>paused=true,resume:()=>paused=false,stop:()=>over=true});
}

function initSnake(){
 const canvas=$('#snake'),ctx=canvas.getContext('2d'),cell=20;let snake,food,dir,next,score,timer;
 function placeFood(){do food={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};while(snake.some(p=>p.x===food.x&&p.y===food.y))}
 function start(){clearInterval(timer);snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir=next={x:1,y:0};score=0;placeFood();draw();timer=setInterval(step,125);$('#status').textContent='Score: 0'}
 function step(){dir=next;let h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.x>=20||h.y<0||h.y>=20||snake.some(p=>p.x===h.x&&p.y===h.y)){clearInterval(timer);let reward=score*2;showGameOver('Game over',`Score: ${score}${reward?grantReward(reward,score>=10):''}`);return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;$('#status').textContent=`Score: ${score}`;placeFood()}else snake.pop();draw()}
 function draw(){ctx.fillStyle='#edf2ec';ctx.fillRect(0,0,400,400);const skin=progress.get('apple-equipped','classic'),apples={classic:'#ed795f',gold:'#f3c84b',berry:'#9078c5'};ctx.fillStyle=skin==='watermelon'?'#3f9b66':apples[skin]||apples.classic;ctx.beginPath();ctx.arc(food.x*cell+10,food.y*cell+11,8,0,7);ctx.fill();if(skin==='watermelon'){ctx.fillStyle='#ed795f';ctx.beginPath();ctx.arc(food.x*cell+10,food.y*cell+11,5,0,7);ctx.fill();ctx.fillStyle='#15251f';ctx.fillRect(food.x*cell+9,food.y*cell+8,2,3)}ctx.fillStyle='#264c3d';ctx.fillRect(food.x*cell+9,food.y*cell+1,3,5);snake.forEach(p=>ctx.fillRect(p.x*cell+1,p.y*cell+1,18,18));const item=progress.get('snake-equipped','none'),h=snake[0];if(item==='crown'){ctx.fillStyle='#f3c84b';ctx.font='20px serif';ctx.fillText('♛',h.x*cell,h.y*cell)}if(item==='bow'){ctx.fillStyle='#ed795f';ctx.beginPath();ctx.arc(h.x*cell+4,h.y*cell+3,5,0,7);ctx.arc(h.x*cell+14,h.y*cell+3,5,0,7);ctx.fill()}}
 addEventListener('keydown',e=>{const keys={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};if(keys[e.key]){e.preventDefault();let n=keys[e.key];if(n.x!==-dir.x||n.y!==-dir.y)next=n}});$('#reset').onclick=start;start();setupGameControls({points:()=>score*2,pause:()=>{clearInterval(timer);timer=null},resume:()=>{if(!timer)timer=setInterval(step,125)},stop:()=>{clearInterval(timer);timer=null}});
}

function init2048(){
 const el=$('#twenty');document.body.classList.add(`twenty-${progress.get('twenty-equipped','classic')}`);let board,score,paused=false,ended=false;
 function add(){let empty=board.map((v,i)=>v?null:i).filter(v=>v!==null);if(empty.length)board[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4}
 function draw(){el.innerHTML='';board.forEach(v=>{let c=document.createElement('div');c.className='twenty-cell';c.dataset.value=v;c.textContent=v||'';el.appendChild(c)});$('#status').textContent=`Score: ${score}`}
 function slide(row){let a=row.filter(Boolean),out=[];for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){out.push(a[i]*2);score+=a[i]*2;i++}else out.push(a[i])}while(out.length<4)out.push(0);return out}
 function move(key){let old=board.join('');for(let n=0;n<4;n++){let ids=[];if(key==='ArrowLeft'||key==='ArrowRight')for(let i=0;i<4;i++)ids.push(n*4+i);else for(let i=0;i<4;i++)ids.push(i*4+n);if(key==='ArrowRight'||key==='ArrowDown')ids.reverse();let vals=slide(ids.map(i=>board[i]));ids.forEach((id,i)=>board[id]=vals[i])}if(board.join('')!==old){add();draw();if(board.includes(2048))showGameOver('You made 2048!',`Nicely done.${grantReward(100)}`)}else if(!board.includes(0)&&!canMove())showGameOver('No more moves',`Score: ${score}`)}
 function canMove(){return board.some((v,i)=>(i%4<3&&v===board[i+1])||(i<12&&v===board[i+4]))}
 function start(){board=Array(16).fill(0);score=0;paused=false;ended=false;add();add();draw()}addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')&&!paused&&!ended){e.preventDefault();move(e.key)}});$('#reset').onclick=start;start();setupGameControls({points:()=>Math.floor(score/20),pause:()=>paused=true,resume:()=>paused=false,stop:()=>ended=true});
}

function initTetris(){
 const canvas=$('#tetris'),ctx=canvas.getContext('2d'),cols=10,rows=16,s=30,colors=['','#f3c84b','#73aee8','#ed795f','#9078c5','#86b889'];const shapes=[[[1,1,1,1]],[[2,2],[2,2]],[[0,3,0],[3,3,3]],[[4,0,0],[4,4,4]],[[0,5,5],[5,5,0]]];let board,piece,x,y,lines,timer,paused=false,ended=false;
 function newPiece(){piece=shapes[Math.floor(Math.random()*shapes.length)].map(r=>r.slice());x=3;y=0;if(hit(piece,x,y)){clearInterval(timer);let reward=lines*4;showGameOver('Game over',`Lines: ${lines}${reward?grantReward(reward,lines>=10):''}`)}}
 function hit(p,px,py){return p.some((r,dy)=>r.some((v,dx)=>v&&(px+dx<0||px+dx>=cols||py+dy>=rows||(py+dy>=0&&board[py+dy][px+dx]))))}
 function lock(){piece.forEach((r,dy)=>r.forEach((v,dx)=>{if(v)board[y+dy][x+dx]=v}));for(let r=rows-1;r>=0;r--)if(board[r].every(Boolean)){board.splice(r,1);board.unshift(Array(cols).fill(0));lines++;r++}$('#status').textContent=`Lines: ${lines}`;newPiece()}
 function rotate(){let p=piece[0].map((_,i)=>piece.map(r=>r[i]).reverse());if(!hit(p,x,y))piece=p}
 function drop(){if(!hit(piece,x,y+1))y++;else lock();draw()}
 function draw(){const backgrounds={classic:'#172a23',sunset:'#4a2434',ocean:'#123b53'};ctx.fillStyle=backgrounds[progress.get('tetris-equipped','classic')]||backgrounds.classic;ctx.fillRect(0,0,300,480);board.forEach((r,yy)=>r.forEach((v,xx)=>paint(v,xx,yy)));piece.forEach((r,dy)=>r.forEach((v,dx)=>paint(v,x+dx,y+dy)))}
 function paint(v,xx,yy){if(!v)return;ctx.fillStyle=colors[v];ctx.fillRect(xx*s+1,yy*s+1,s-2,s-2)}
 function start(){clearInterval(timer);document.body.classList.add(`tetris-${progress.get('tetris-equipped','classic')}`);board=Array.from({length:rows},()=>Array(cols).fill(0));lines=0;paused=false;ended=false;$('#status').textContent='Lines: 0';newPiece();draw();timer=setInterval(drop,550)}
 addEventListener('keydown',e=>{if(paused||ended||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowUp')rotate();else{let nx=x+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0),ny=y+(e.key==='ArrowDown'?1:0);if(!hit(piece,nx,ny)){x=nx;y=ny}}draw()});$('#reset').onclick=start;start();setupGameControls({points:()=>lines*4,pause:()=>{paused=true;clearInterval(timer);timer=null},resume:()=>{paused=false;if(!timer)timer=setInterval(drop,550)},stop:()=>{ended=true;clearInterval(timer);timer=null}});
}

function initHomeEconomy(){
 const card=$('#mystery-card');
 function update(){const points=progress.get('points'),wins=progress.get('wins');$('#home-points').textContent=points;$('#home-wins').textContent=wins;if(wins<5){card.classList.add('locked');$('#unlock-copy').textContent=`${wins} / 5 wins`}else{card.classList.remove('locked');$('#mystery-title').textContent='Memory';$('#unlock-copy').textContent='Unlocked'}}
 update();addEventListener('storage',event=>{if(event.key?.startsWith('pixel-'))update()});
}

function initShop(){
 const items=[
  {id:'crown',type:'snake',name:'Snake crown',icon:'♛',cost:50},
  {id:'bow',type:'snake',name:'Snake bow',icon:'🎀',cost:35},
  {id:'gold',type:'apple',name:'Golden apple',icon:'🍏',cost:45},
  {id:'berry',type:'apple',name:'Berry apple',icon:'🫐',cost:45},
  {id:'watermelon',type:'apple',name:'Watermelon apple',icon:'🍉',cost:60},
  {id:'gem',type:'mines',name:'Gem flags',icon:'◆',cost:40},
  {id:'star',type:'mines',name:'Star flags',icon:'★',cost:55},
  {id:'navy',type:'battle',name:'Navy fleet',icon:'⚓',cost:65},
  {id:'candy',type:'battle',name:'Candy fleet',icon:'🚢',cost:65},
  {id:'midnight',type:'sudoku',name:'Midnight Sudoku',icon:'🌙',cost:60},
  {id:'mint',type:'sudoku',name:'Mint Sudoku',icon:'▦',cost:50},
  {id:'neon',type:'twenty',name:'Neon 2048',icon:'✨',cost:70},
  {id:'pastel',type:'twenty',name:'Pastel 2048',icon:'🎨',cost:70},
  {id:'sunset',type:'tetris',name:'Sunset Tetris',icon:'🌇',cost:80},
  {id:'ocean',type:'tetris',name:'Ocean Tetris',icon:'🌊',cost:80}
 ];
 const grid=$('#shop-grid');
 function render(){let points=progress.get('points'),owned=progress.get('owned',[]);$('#shop-points').textContent=`${points} points`;grid.innerHTML='';[...items].sort((a,b)=>Number(owned.includes(b.id))-Number(owned.includes(a.id))).forEach(item=>{let has=owned.includes(item.id),equipped=progress.get(`${item.type}-equipped`,'none')===item.id,labels={snake:'Snake accessory',apple:'Snake food',mines:'Minesweeper flag',battle:'Battleship skin',sudoku:'Sudoku skin',twenty:'2048 theme',tetris:'Tetris theme'},box=document.createElement('article');box.className=`shop-item${has?' owned':''}`;box.innerHTML=`<div class="shop-icon">${item.icon}</div><div class="shop-info"><h2>${item.name}</h2><p>${has?'Owned · ':''}${labels[item.type]} · ${item.cost} pts</p></div><button>${equipped?'Equipped':has?'Equip':'Buy'}</button>`;let button=box.querySelector('button');button.disabled=equipped||(!has&&points<item.cost);button.onclick=()=>{if(!has){progress.set('points',points-item.cost);owned.push(item.id);progress.set('owned',owned)}progress.set(`${item.type}-equipped`,item.id);render()};grid.appendChild(box)})}render();
}

function initMemory(){
 if(progress.get('wins')<5){location.href='index.html';return}
 const board=$('#memory'),icons=['●','▲','■','◆','★','♥','☀','♣'];let cards,first=null,locked=false,pairs=0;
 function start(){pairs=0;first=null;locked=false;cards=[...icons,...icons].sort(()=>Math.random()-.5);board.innerHTML='';cards.forEach((icon,i)=>{let b=document.createElement('button');b.className='memory-card';b.textContent=icon;b.setAttribute('aria-label',`Card ${i+1}`);b.onclick=()=>flip(b,icon);board.appendChild(b)});$('#status').textContent='Pairs: 0 / 8'}
 function flip(card,icon){if(locked||card.classList.contains('open')||card.classList.contains('matched'))return;card.classList.add('open');if(!first){first={card,icon};return}if(first.icon===icon){first.card.classList.add('matched');card.classList.add('matched');first=null;pairs++;$('#status').textContent=`Pairs: ${pairs} / 8`;if(pairs===8)showGameOver('All matched!',`Mystery solved.${grantReward(80)}`)}else{locked=true;setTimeout(()=>{first.card.classList.remove('open');card.classList.remove('open');first=null;locked=false},650)}}
 $('#reset').onclick=start;start();setupGameControls({points:()=>pairs*5,pause:()=>locked=true,resume:()=>locked=false,stop:()=>locked=true});
}

function initLeaderboard(){
 let name=progress.get('username','');if(!name){name=`User${Math.floor(1000+Math.random()*9000)}`;progress.set('username',name)}
 const rivals=[['User1842',940],['User7301',720],['User4620',540],['User9155',380],['User2674',210]],board=$('#leaderboard');
 function render(){name=progress.get('username');const rows=[...rivals,[name,progress.get('points'),true]].sort((a,b)=>b[1]-a[1]);board.innerHTML='<div class="leader-row leader-head"><span>Rank</span><span>Player</span><span>Points</span><span></span></div>';rows.forEach((row,i)=>{let el=document.createElement('div');el.className=`leader-row${row[2]?' you':''}`;el.innerHTML=`<strong>#${i+1}</strong><span>${row[0]}${row[2]?' <small>You</small>':''}</span><b>${row[1]}</b>${row[2]?'<button>Edit</button>':'<span></span>'}`;if(row[2])el.querySelector('button').onclick=()=>edit(el,row[0]);board.appendChild(el)})}
 function edit(row,current){const cell=row.children[1];cell.innerHTML=`<input maxlength="18" aria-label="Your leaderboard name" value="${current}">`;const input=cell.querySelector('input'),button=row.querySelector('button');button.textContent='Save';input.focus();button.onclick=()=>{let value=input.value.trim().replace(/[<>]/g,'').slice(0,18);if(value){progress.set('username',value);render()}}}
 render();addEventListener('storage',render);
}
