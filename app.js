(() => {
  const obras = Array.isArray(window.SINOX_OBRAS) ? window.SINOX_OBRAS : SINOX_OBRAS;
  let index = 0, yes = [], startX = 0, dx = 0, dragging = false, locked = false;

  const card = document.querySelector('#card');
  const art = document.querySelector('#art');
  const loading = document.querySelector('#loading');
  const counter = document.querySelector('#counter');
  const noStamp = document.querySelector('#noStamp');
  const yesStamp = document.querySelector('#yesStamp');
  const game = document.querySelector('#game');
  const results = document.querySelector('#results');
  const grid = document.querySelector('#yesGrid');

  function show() {
    const obra = obras[index];
    locked = false; dx = 0;
    counter.textContent = `${index + 1} / ${obras.length}`;
    card.style.transition = 'none';
    card.style.transform = '';
    card.style.opacity = '1';
    noStamp.style.opacity = yesStamp.style.opacity = 0;
    art.classList.remove('ready');
    loading.hidden = false;
    art.alt = `Obra ${index + 1}`;
    art.onload = () => { loading.hidden = true; art.classList.add('ready'); };
    art.onerror = () => { loading.textContent = 'No se pudo cargar esta imagen'; loading.hidden = false; };
    art.src = obra.imagen;
  }

  function vote(isYes) {
    if (locked) return;
    locked = true;
    if (isYes) yes.push(obras[index]);
    const dir = isYes ? 1 : -1;
    card.style.transition = 'transform .22s ease, opacity .22s ease';
    card.style.transform = `translateX(${dir * 520}px) rotate(${dir * 10}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      index++;
      index >= obras.length ? finish() : show();
    }, 230);
  }

  function finish() {
    game.hidden = true;
    results.hidden = false;
    grid.innerHTML = yes.length ? yes.map(o => `
      <article class="pick" title="${o.titulo} · ${o.autor}">
        <img src="${o.imagen}" alt="${o.titulo}" loading="lazy">
        <div class="meta"><strong>${o.titulo}</strong><span>${o.autor} · ${o.categoria}</span></div>
      </article>`).join('') : '<p class="empty">Hoy no ha habido ningún SÍ.</p>';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  document.querySelector('#noBtn').addEventListener('click', () => vote(false));
  document.querySelector('#yesBtn').addEventListener('click', () => vote(true));
  document.querySelector('#restartBtn').addEventListener('click', () => {
    index = 0; yes = []; results.hidden = true; game.hidden = false; show();
  });

  card.addEventListener('pointerdown', e => {
    if (locked) return;
    dragging = true; startX = e.clientX; dx = 0;
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', e => {
    if (!dragging || locked) return;
    dx = e.clientX - startX;
    card.style.transform = `translateX(${dx}px) rotate(${dx/38}deg)`;
    yesStamp.style.opacity = Math.min(1, Math.max(0, dx/85));
    noStamp.style.opacity = Math.min(1, Math.max(0, -dx/85));
  });
  card.addEventListener('pointerup', () => {
    if (!dragging || locked) return;
    dragging = false;
    if (Math.abs(dx) > 72) vote(dx > 0);
    else {
      card.style.transition = 'transform .16s ease';
      card.style.transform = '';
      noStamp.style.opacity = yesStamp.style.opacity = 0;
    }
  });

  document.addEventListener('keydown', e => {
    if (game.hidden || locked) return;
    if (e.key === 'ArrowLeft') vote(false);
    if (e.key === 'ArrowRight') vote(true);
  });

  show();
})();
