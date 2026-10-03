/* Baby Pet v0.1 — os dados ficam salvos neste aparelho (localStorage). */
(function () {
  'use strict';

  const KEY = 'babypet.v1';
  const ESPECIES = [['cao','Cachorro'],['gato','Gato'],['ave','Ave'],['roedor','Roedor'],['coelho','Coelho'],['reptil','Réptil'],['peixe','Peixe'],['outro','Outro']];
  const TIPOS_VAC = [['vacina','Vacina'],['vermifugo','Vermífugo'],['antipulgas','Antipulgas'],['outro','Outro']];
  const CATEG = [['racao','Ração'],['consulta','Consulta'],['vacina','Vacina'],['exame','Exame'],['medicamento','Remédio'],['banho_tosa','Banho e tosa'],['hospedagem','Hospedagem'],['treinamento','Treino'],['acessorio','Acessórios'],['outro','Outros']];
  const TABS = [['inicio','Início'],['saude','Saúde'],['comida','Comida'],['peso','Peso'],['gastos','Gastos'],['mais','Mais']];

  /* Ícones: hoje são emojis. Quando tiver ícones 3D, coloque o arquivo em assets/icones/
     e escreva o caminho aqui, por exemplo:  saude: 'assets/icones/saude.png'  */
  const EMOJI = { inicio:'🏠', saude:'💉', comida:'🍖', peso:'⚖️', gastos:'💰', mais:'✨', vermifugo:'💊', antipulgas:'🐜', vacina:'💉', outro:'📌' };
  const PNG = {};
  const icone = k => PNG[k] ? `<img class="ico" src="${PNG[k]}" alt="">` : (EMOJI[k] || '');

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoje = () => iso(new Date());
  const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dias = (a, b) => Math.round((pd(b) - pd(a)) / 86400000);
  const addDias = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
  const fmtData = s => s ? pd(s).toLocaleDateString('pt-BR') : '';
  const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const kg = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' kg';
  const gr = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' g';
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rotulo = (lista, k) => (lista.find(x => x[0] === k) || [k, k])[1];
  const plural = (n, a, b) => n === 1 ? a : b;

  /* ---------- dados ---------- */
  const vazio = () => ({ pets: [], ativo: null, vacinas: [], planos: {}, refeicoes: [], pesos: [], gastos: [], streak: { dias: 0, ultimo: null } });
  function carregar() {
    try { return Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return vazio(); }
  }
  let S = carregar();
  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { aviso('Não deu para salvar. O armazenamento do aparelho pode estar cheio.'); }
  }
  const petAtivo = () => S.pets.find(p => p.id === S.ativo) || S.pets[0] || null;

  let tab = 'inicio';
  let mes = hoje().slice(0, 7);

  /* ---------- regras ---------- */
  function idade(nasc) {
    if (!nasc) return '';
    const d = dias(nasc, hoje());
    if (d < 0) return '';
    const m = Math.floor(d / 30.44);
    if (m < 1) return d + plural(d, ' dia', ' dias');
    if (m < 24) return m + plural(m, ' mês', ' meses');
    return Math.floor(m / 12) + ' anos';
  }
  function statusVac(v) {
    if (!v.proxima) return { cls: 'neutro', txt: 'Sem próxima', ordem: 9999, d: null };
    const d = dias(hoje(), v.proxima);
    if (d < 0) return { cls: 'bad', txt: 'Atrasada ' + (-d) + 'd', ordem: d, d };
    if (d === 0) return { cls: 'warn', txt: 'É hoje', ordem: 0, d };
    if (d <= 30) return { cls: 'warn', txt: 'Em ' + d + 'd', ordem: d, d };
    return { cls: 'ok', txt: 'Em dia', ordem: d, d };
  }
  const vacinasDo = p => S.vacinas.filter(v => v.petId === p.id).sort((a, b) => statusVac(a).ordem - statusVac(b).ordem);
  const planoDo = p => S.planos[p.id] || null;
  function infoPacote(pl) {
    if (!pl || !pl.pacote || !pl.dose) return null;
    const dur = Math.floor(pl.pacote / pl.dose);
    if (dur < 1) return null;
    const aberto = pl.aberto || hoje();
    const usados = Math.max(0, dias(aberto, hoje()));
    return { dur, aberto, resta: dur - usados, acaba: addDias(aberto, dur), pct: Math.min(100, usados / dur * 100) };
  }
  const pesosDo = p => S.pesos.filter(x => x.petId === p.id).sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  const gastosDo = p => S.gastos.filter(g => g.petId === p.id);
  const refeicoesDo = p => S.refeicoes.filter(r => r.petId === p.id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  function tocou() {
    const h = hoje(), s = S.streak;
    if (s.ultimo === h) return;
    const o = new Date(); o.setDate(o.getDate() - 1);
    s.dias = s.ultimo === iso(o) ? s.dias + 1 : 1;
    s.ultimo = h;
  }
  function streakAtual() {
    const s = S.streak; if (!s.ultimo) return 0;
    const d = dias(s.ultimo, hoje());
    return d <= 1 ? s.dias : 0;
  }

  /* ---------- feedback ---------- */
  let tt;
  function aviso(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function festa() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cores = ['#14C8C0', '#FF9A4D', '#FF7FB0', '#FFC92F', '#7B6CF6'];
    for (let i = 0; i < 22; i++) {
      const e = document.createElement('i'); e.className = 'confete';
      e.style.setProperty('--x', (Math.random() * 100) + 'vw');
      e.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      e.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      e.style.setProperty('--d', (1.1 + Math.random() * .9) + 's');
      e.style.background = cores[i % 5];
      document.body.appendChild(e); setTimeout(() => e.remove(), 2300);
    }
  }

  /* ---------- telas ---------- */
  const avatar = p => p.foto || 'assets/babi.png';

  function topo() {
    return `<header class="topo"><img src="assets/icon-192.png" alt=""><b>Baby Pet</b></header>
    <div class="pets">${S.pets.map(p => `<button class="chip ${p.id === petAtivo().id ? 'on' : ''}" data-act="${p.id === petAtivo().id ? 'editpet' : 'pet'}:${p.id}" ${p.id === petAtivo().id ? 'title="Toque para editar"' : ''}><img src="${esc(avatar(p))}" alt="">${esc(p.nome)}</button>`).join('')}
      <button class="chip add" data-act="addpet">+ Pet</button></div>`;
  }

  function telaBoasVindas() {
    return `<section class="boas"><img src="assets/cuidadora.png" alt="Babi, a cuidadora do app">
      <h1>Oi! Eu sou a Babi</h1>
      <p>Vou te ajudar a cuidar do seu pet: vacinas, ração, peso e gastos num lugar só.</p>
      <button class="btn" data-act="addpet">Cadastrar meu pet</button></section>`;
  }

  function mensagemBabi(p) {
    const vs = vacinasDo(p), atras = vs.filter(v => statusVac(v).d !== null && statusVac(v).d < 0);
    if (atras.length) return `<b>Atenção!</b>${esc(p.nome)} tem ${atras.length} ${plural(atras.length, 'item de saúde atrasado', 'itens de saúde atrasados')}.`;
    const prox = vs.find(v => { const d = statusVac(v).d; return d !== null && d >= 0 && d <= 7; });
    if (prox) return `<b>Já já!</b>${esc(prox.nome)} do ${esc(p.nome)} vence em ${statusVac(prox).d} ${plural(statusVac(prox).d, 'dia', 'dias')}.`;
    const ip = infoPacote(planoDo(p));
    if (ip && ip.resta <= 7) return `<b>Hora de comprar!</b>A ração do ${esc(p.nome)} acaba em cerca de ${Math.max(ip.resta, 0)} ${plural(ip.resta, 'dia', 'dias')}.`;
    if (!vs.length) return `<b>Vamos começar?</b>Cadastre a primeira vacina do ${esc(p.nome)}.`;
    return `<b>Tudo certo!</b>${esc(p.nome)} está com tudo em dia. Bom trabalho, tutor!`;
  }

  function telaInicio(p) {
    const vs = vacinasDo(p).filter(v => v.proxima);
    const prox = vs[0];
    const ip = infoPacote(planoDo(p));
    const ps = pesosDo(p), ultimo = ps[ps.length - 1];
    const gm = gastosDo(p).filter(g => g.data.slice(0, 7) === hoje().slice(0, 7)).reduce((t, g) => t + g.valor, 0);
    const st = streakAtual();
    return `<section class="hero glass"><img src="assets/cuidadora-busto.png" alt="Babi"><div class="bolha">${mensagemBabi(p)}</div></section>
    <div class="grid2">
      <button class="tile t-pk" data-act="tab:saude"><span class="t">${icone('saude')} Saúde</span>
        <span class="v">${prox ? (statusVac(prox).d < 0 ? 'Atrasada' : statusVac(prox).d === 0 ? 'Hoje' : 'em ' + statusVac(prox).d + ' d') : '—'}</span>
        <span class="s">${prox ? esc(prox.nome) : 'Nenhuma dose marcada'}</span></button>
      <button class="tile t-or" data-act="tab:comida"><span class="t">${icone('comida')} Ração</span>
        <span class="v">${ip ? (ip.resta > 0 ? '~' + ip.resta + ' d' : 'Acabou') : '—'}</span>
        <span class="s">${ip ? 'até acabar o pacote' : 'Configure o plano'}</span></button>
      <button class="tile t-yl" data-act="tab:peso"><span class="t">${icone('peso')} Peso</span>
        <span class="v">${ultimo ? kg(ultimo.kg) : '—'}</span>
        <span class="s">${ultimo ? 'em ' + fmtData(ultimo.data) : 'Sem pesagem ainda'}</span></button>
      <button class="tile t-pp" data-act="tab:gastos"><span class="t">${icone('gastos')} Gastos do mês</span>
        <span class="v">${brl(gm)}</span><span class="s">${esc(p.nome)}</span></button>
    </div>
    <div class="glass streak"><span class="n">${st}</span><div><b>${plural(st, 'dia', 'dias')} cuidando</b><small>${S.streak.ultimo === hoje() ? 'Hoje já tem registro. Parabéns!' : st ? 'Registre algo hoje para manter a sequência.' : 'Registre algo hoje para começar.'}</small></div></div>
    <h2>Registrar agora</h2>
    <div class="acoes">
      <button class="btn sm" data-act="dar">Dar ração</button>
      <button class="btn sm" data-act="addpeso">Peso</button>
      <button class="btn sm" data-act="addgasto">Gasto</button>
    </div>`;
  }

  function telaSaude(p) {
    const vs = vacinasDo(p);
    return `<h1>Saúde do ${esc(p.nome)}</h1><p class="peq" style="margin:4px 0 14px">Vacinas, vermífugos e antipulgas.</p>
    ${vs.length ? `<div class="lista">${vs.map(v => { const s = statusVac(v); return `<button class="item" data-act="editvac:${v.id}">
        <div class="ic">${icone(v.tipo)}</div>
        <div class="tx"><b>${esc(v.nome)}</b><small>${v.aplicada ? 'Aplicada em ' + fmtData(v.aplicada) : 'Ainda não aplicada'}${v.proxima ? ' · próxima ' + fmtData(v.proxima) : ''}</small></div>
        <span class="tag ${s.cls}">${s.txt}</span></button>`; }).join('')}</div>`
      : `<div class="glass card vazio"><img src="assets/cuidadora-busto.png" alt=""><h3>Nenhuma vacina ainda</h3><p>Cadastre a primeira para receber o alerta de vencimento aqui.</p></div>`}
    <div class="acoes" style="margin-top:16px"><button class="btn" data-act="addvac">Adicionar</button></div>`;
  }

  function telaComida(p) {
    const pl = planoDo(p);
    if (!pl) return `<h1>Comida</h1><div class="glass card vazio" style="margin-top:14px"><img src="assets/cuidadora-busto.png" alt=""><h3>Configure a ração</h3><p>Diga quanto o ${esc(p.nome)} come por dia e o tamanho do pacote. O app calcula quando a ração acaba.</p><button class="btn" data-act="plano">Configurar ração</button></div>`;
    const ip = infoPacote(pl), h = hoje();
    const rs = refeicoesDo(p), rh = rs.filter(r => r.data === h);
    const porRef = Math.round(pl.dose / pl.refeicoes);
    const totalHoje = rh.reduce((t, r) => t + r.g, 0);
    return `<h1>Comida</h1>
    <div class="glass card" style="margin-top:14px">
      <div class="linha"><b>${esc(pl.produto)}${pl.marca ? ' · ' + esc(pl.marca) : ''}</b><small>${gr(pl.dose)}/dia</small></div>
      <div class="linha" style="margin-top:10px"><span>Hoje: ${rh.length} de ${pl.refeicoes} ${plural(pl.refeicoes, 'refeição', 'refeições')}</span><b>${gr(totalHoje)}</b></div>
      <div class="barra"><i style="width:${Math.min(100, rh.length / pl.refeicoes * 100)}%"></i></div>
      <button class="btn full" style="margin-top:8px" data-act="dar">Dar ração (${gr(porRef)})</button>
    </div>
    ${ip ? `<div class="glass card"><h3>Pacote de ${gr(pl.pacote)}</h3>
      <p class="peq">Aberto em ${fmtData(ip.aberto)} · dura cerca de ${ip.dur} dias</p>
      <div class="barra"><i style="width:${ip.pct}%"></i></div>
      <div class="linha"><b>${ip.resta > 0 ? 'Faltam ~' + ip.resta + ' ' + plural(ip.resta, 'dia', 'dias') : 'Pacote no fim'}</b><small>acaba por volta de ${fmtData(ip.acaba)}</small></div></div>` : ''}
    <div class="acoes" style="margin-top:12px"><button class="ghost" data-act="novopacote">Abri um novo pacote</button><button class="ghost" data-act="plano">Editar plano</button></div>
    <h2>Últimas refeições</h2>
    ${rs.length ? `<div class="lista">${rs.slice(0, 8).map(r => `<div class="item"><div class="ic">🍖</div><div class="tx"><b>${gr(r.g)}</b><small>${r.data === h ? 'Hoje' : fmtData(r.data)} às ${esc(r.hora)}</small></div><button class="x" aria-label="Apagar refeição" data-act="delref:${r.id}">×</button></div>`).join('')}</div>` : '<p class="peq">Nenhuma refeição registrada.</p>'}`;
  }

  function grafico(pts) {
    const W = 320, H = 150, P = 22, vs = pts.map(x => x.kg);
    let mn = Math.min(...vs), mx = Math.max(...vs);
    if (mn === mx) { mn -= 1; mx += 1; }
    const x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => H - P - (v - mn) * (H - 2 * P) / (mx - mn);
    const d = pts.map((q, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(q.kg).toFixed(1)).join(' ');
    const rot = (i) => `<text x="${x(i).toFixed(1)}" y="${(y(pts[i].kg) - 9).toFixed(1)}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${esc(kg(pts[i].kg))}</text>`;
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de peso">
      <path d="${d}" fill="none" stroke="#14C8C0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((q, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(q.kg).toFixed(1)}" r="5" fill="#FFC92F" stroke="#087C78" stroke-width="2"/>`).join('')}
      ${rot(0)}${pts.length > 1 ? rot(pts.length - 1) : ''}</svg>`;
  }

  function telaPeso(p) {
    const ps = pesosDo(p), ult = ps[ps.length - 1], ant = ps[ps.length - 2];
    let nota = '';
    if (ult && ant) {
      const dif = ult.kg - ant.kg, pct = dif / ant.kg * 100;
      nota = `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${kg(Math.abs(dif))} desde a pesagem anterior`;
      if (Math.abs(pct) >= 10) nota += `<br><b>Mudança grande de peso. Vale conversar com o veterinário.</b>`;
    }
    return `<h1>Peso</h1>
    <div class="glass card" style="margin-top:14px">
      ${ult ? `<div class="grande">${kg(ult.kg)}</div><small>em ${fmtData(ult.data)}</small><p class="peq" style="margin-top:6px">${nota}</p>` : `<p class="peq">Nenhuma pesagem ainda.</p>`}
      ${ps.length > 1 ? `<div style="margin-top:10px">${grafico(ps.slice(-12))}</div>` : (ps.length ? '<p class="peq" style="margin-top:8px">Registre mais uma pesagem para ver o gráfico.</p>' : '')}
    </div>
    <div class="acoes" style="margin-top:14px"><button class="btn" data-act="addpeso">Registrar peso</button></div>
    ${ps.length ? `<h2>Histórico</h2><div class="lista">${ps.slice().reverse().map(x => `<div class="item"><div class="ic">⚖️</div><div class="tx"><b>${kg(x.kg)}</b><small>${fmtData(x.data)}</small></div><button class="x" aria-label="Apagar pesagem" data-act="delpeso:${x.id}">×</button></div>`).join('')}</div>` : ''}`;
  }

  function telaGastos(p) {
    const gs = gastosDo(p).filter(g => g.data.slice(0, 7) === mes).sort((a, b) => b.data.localeCompare(a.data));
    const total = gs.reduce((t, g) => t + g.valor, 0);
    const porCat = {}; gs.forEach(g => { porCat[g.cat] = (porCat[g.cat] || 0) + g.valor; });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    let nome = pd(mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    return `<h1>Gastos do ${esc(p.nome)}</h1>
    <div class="mesnav" style="margin-top:12px"><button data-act="mes:-1" aria-label="Mês anterior">‹</button><b>${esc(nome)}</b><button data-act="mes:1" aria-label="Próximo mês">›</button></div>
    <div class="glass card"><small>Total do mês</small><div class="grande">${brl(total)}</div>
      ${cats.map(([c, v]) => `<div class="catrow"><div class="linha"><span>${esc(rotulo(CATEG, c))}</span><span>${brl(v)}</span></div><div class="barra"><i style="width:${v / total * 100}%"></i></div></div>`).join('')}
      ${!cats.length ? '<p class="peq" style="margin-top:6px">Nenhum gasto neste mês.</p>' : ''}</div>
    <div class="acoes" style="margin-top:14px"><button class="btn" data-act="addgasto">Novo gasto</button></div>
    ${gs.length ? `<h2>Lançamentos</h2><div class="lista">${gs.map(g => `<button class="item" data-act="editgasto:${g.id}"><div class="ic">💰</div><div class="tx"><b>${esc(g.desc || rotulo(CATEG, g.cat))}</b><small>${esc(rotulo(CATEG, g.cat))} · ${fmtData(g.data)}</small></div><span class="dir">${brl(g.valor)}</span></button>`).join('')}</div>` : ''}`;
  }

  function telaMais() {
    return `<h1>Mais</h1>
    <div class="glass card" style="margin-top:14px"><h3>Seus dados</h3>
      <p class="peq" style="margin:4px 0 12px">Tudo fica salvo só neste aparelho. Faça um backup de vez em quando.</p>
      <div class="acoes"><button class="ghost" data-act="exportar">Exportar backup</button><button class="ghost" data-act="importar">Importar backup</button></div>
      <input id="arq" type="file" accept="application/json,.json" hidden></div>
    <div class="glass card"><h3>Instalar no celular</h3>
      <p class="peq" style="margin-top:4px"><b>Android (Chrome):</b> menu ⋮ e depois "Instalar app".<br><b>iPhone (Safari):</b> botão Compartilhar e depois "Adicionar à Tela de Início".</p></div>
    <div class="glass card"><h3>Vem por aí</h3>
      <p class="peq" style="margin-top:4px">Biblioteca de espécies e raças, consultas e exames, agenda, exercícios e convite para cuidadoras.</p></div>
    <div class="glass card"><button class="ghost perigo full" data-act="apagar">Apagar todos os dados</button></div>
    <p class="peq" style="text-align:center;margin-top:16px">Baby Pet v0.1</p>`;
  }

  function render() {
    const y = window.scrollY;
    const app = $('#app');
    if (!S.pets.length) { app.innerHTML = telaBoasVindas(); return; }
    const p = petAtivo(); S.ativo = p.id;
    const tela = { inicio: telaInicio, saude: telaSaude, comida: telaComida, peso: telaPeso, gastos: telaGastos }[tab];
    app.innerHTML = topo() + (tela ? tela(p) : telaMais()) +
      `<nav class="nav" aria-label="Menu">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''} data-act="tab:${k}"><span>${icone(k)}</span><small>${l}</small></button>`).join('')}</nav>`;
    window.scrollTo(0, y);
  }

  /* ---------- formulários ---------- */
  function campo(f) {
    const v = f.value == null ? '' : f.value, req = f.req ? 'required' : '';
    if (f.type === 'select') return `<label class="fld"><span>${esc(f.label)}</span><select name="${f.name}" ${req}>${f.options.map(([k, t]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const modo = f.type === 'num' ? 'type="text" inputmode="decimal"' : `type="${f.type || 'text'}"`;
    return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" ${modo} value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.type === 'file' ? 'accept="image/*"' : ''} ${req}></label>`;
  }
  function fechar() { $('#sheet-root').innerHTML = ''; }
  function abrirFolha(o) {
    const raiz = $('#sheet-root');
    const corpo = o.campos.map(c => Array.isArray(c) ? `<div class="dupla">${c.map(campo).join('')}</div>` : campo(c)).join('');
    raiz.innerHTML = `<div class="veu" data-act="fechar"></div><form class="sheet" role="dialog" aria-modal="true" aria-label="${esc(o.titulo)}"><h2>${esc(o.titulo)}</h2>${corpo}
      <div class="rodape"><button class="btn full" type="submit">${esc(o.ok || 'Salvar')}</button>
      ${o.excluir ? '<button class="ghost perigo" type="button" data-sheet="excluir">Excluir</button>' : ''}
      <button class="ghost" type="button" data-act="fechar">Cancelar</button></div></form>`;
    const form = $('form', raiz);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      Promise.resolve().then(() => o.aoSalvar(d, form)).then(() => { fechar(); render(); }).catch(err => { if (!err || err.message !== 'validacao') aviso('Algo deu errado. Tente de novo.'); });
    });
    const ex = $('[data-sheet="excluir"]', raiz);
    if (ex) ex.addEventListener('click', () => { if (confirm(o.confirmar || 'Excluir este item?')) { o.excluir(); salvar(); fechar(); render(); } });
    const primeiro = $('input,select', form); if (primeiro && !('ontouchstart' in window)) primeiro.focus();
  }
  function reduzir(file, max) {
    return new Promise((ok, erro) => {
      const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .82));
      }; img.onerror = erro; img.src = r.result; };
      r.onerror = erro; r.readAsDataURL(file);
    });
  }
  const hora = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  /* ---------- ações ---------- */
  const acoes = {
    tab(k) { tab = k; render(); window.scrollTo(0, 0); },
    pet(id) { S.ativo = id; salvar(); render(); },
    fechar() { fechar(); },

    addpet() { formPet(null); },
    editpet(id) { formPet(S.pets.find(p => p.id === id)); },

    addvac() { formVac(null); },
    editvac(id) { formVac(S.vacinas.find(v => v.id === id)); },

    plano() {
      const p = petAtivo(), pl = planoDo(p) || {};
      abrirFolha({ titulo: 'Plano de ração', campos: [
        { name: 'produto', label: 'Produto', value: pl.produto, req: true, ph: 'Ex.: Ração adulto' },
        { name: 'marca', label: 'Marca', value: pl.marca },
        [{ name: 'dose', label: 'Total por dia (g)', type: 'num', value: pl.dose, req: true }, { name: 'refeicoes', label: 'Refeições por dia', type: 'num', value: pl.refeicoes || 2, req: true }],
        [{ name: 'pacote', label: 'Pacote (g)', type: 'num', value: pl.pacote, ph: '10000' }, { name: 'preco', label: 'Preço do pacote (R$)', type: 'num', value: pl.preco }],
        { name: 'aberto', label: 'Pacote aberto em', type: 'date', value: pl.aberto || hoje() }],
        aoSalvar(d) {
          const dose = num(d.dose), ref = Math.max(1, Math.round(num(d.refeicoes) || 1));
          if (!dose || dose <= 0) { aviso('Informe quantos gramas por dia.'); throw new Error('validacao'); }
          S.planos[p.id] = { produto: d.produto.trim(), marca: d.marca.trim(), dose, refeicoes: ref, pacote: num(d.pacote), preco: num(d.preco), aberto: d.aberto || hoje() };
          salvar();
        } });
    },
    dar() {
      const p = petAtivo(), pl = planoDo(p);
      if (!pl) { tab = 'comida'; render(); acoes.plano(); return; }
      S.refeicoes.push({ id: uid(), petId: p.id, data: hoje(), hora: hora(), g: Math.round(pl.dose / pl.refeicoes) });
      tocou(); salvar(); render(); festa(); aviso('Refeição registrada');
    },
    delref(id) { S.refeicoes = S.refeicoes.filter(r => r.id !== id); salvar(); render(); },
    novopacote() {
      const p = petAtivo(), pl = planoDo(p); if (!pl) return;
      pl.aberto = hoje();
      if (pl.preco > 0 && confirm('Registrar o gasto de ' + brl(pl.preco) + ' em Gastos?')) {
        S.gastos.push({ id: uid(), petId: p.id, cat: 'racao', valor: pl.preco, data: hoje(), desc: pl.produto });
      }
      tocou(); salvar(); render(); festa(); aviso('Novo pacote aberto');
    },

    addpeso() {
      const p = petAtivo();
      abrirFolha({ titulo: 'Registrar peso', campos: [
        { name: 'kg', label: 'Peso (kg)', type: 'num', req: true, ph: 'Ex.: 12,4' },
        { name: 'data', label: 'Data', type: 'date', value: hoje(), req: true }],
        aoSalvar(d) {
          const v = num(d.kg);
          if (!v || v <= 0) { aviso('Informe o peso em kg.'); throw new Error('validacao'); }
          S.pesos = S.pesos.filter(x => !(x.petId === p.id && x.data === d.data));
          S.pesos.push({ id: uid(), petId: p.id, data: d.data, kg: v });
          tocou(); salvar(); setTimeout(festa, 250);
        } });
    },
    delpeso(id) { S.pesos = S.pesos.filter(x => x.id !== id); salvar(); render(); },

    addgasto() { formGasto(null); },
    editgasto(id) { formGasto(S.gastos.find(g => g.id === id)); },
    mes(n) { const d = pd(mes + '-01'); d.setMonth(d.getMonth() + Number(n)); mes = iso(d).slice(0, 7); render(); },

    exportar() {
      const b = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'baby-pet-backup-' + hoje() + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      aviso('Backup salvo na pasta de downloads');
    },
    importar() { const i = $('#arq'); if (i) i.click(); },
    apagar() {
      if (confirm('Apagar TODOS os dados deste aparelho? Isso não pode ser desfeito.')) {
        S = vazio(); salvar(); tab = 'inicio'; render(); aviso('Dados apagados');
      }
    }
  };

  function formPet(p) {
    abrirFolha({ titulo: p ? 'Editar pet' : 'Novo pet', ok: p ? 'Salvar' : 'Cadastrar', campos: [
      { name: 'nome', label: 'Nome', value: p && p.nome, req: true },
      { name: 'especie', label: 'Espécie', type: 'select', options: ESPECIES, value: p ? p.especie : 'cao' },
      { name: 'raca', label: 'Raça (se souber)', value: p && p.raca },
      [{ name: 'sexo', label: 'Sexo', type: 'select', options: [['', 'Não informado'], ['macho', 'Macho'], ['femea', 'Fêmea']], value: p && p.sexo }, { name: 'nasc', label: 'Nascimento', type: 'date', value: p && p.nasc }],
      { name: 'foto', label: p && p.foto ? 'Trocar foto' : 'Foto (opcional)', type: 'file' }],
      confirmar: p ? 'Isso apaga também vacinas, peso, ração e gastos de ' + p.nome + '. Continuar?' : '',
      excluir: p && (() => {
        S.pets = S.pets.filter(x => x.id !== p.id);
        ['vacinas', 'refeicoes', 'pesos', 'gastos'].forEach(k => { S[k] = S[k].filter(x => x.petId !== p.id); });
        delete S.planos[p.id]; S.ativo = S.pets[0] ? S.pets[0].id : null;
      }),
      async aoSalvar(d, form) {
        const arq = form.elements.foto.files[0];
        const foto = arq ? await reduzir(arq, 256) : (p && p.foto) || null;
        const dados = { nome: d.nome.trim(), especie: d.especie, raca: d.raca.trim(), sexo: d.sexo, nasc: d.nasc || null, foto };
        if (p) Object.assign(p, dados);
        else { const novo = Object.assign({ id: uid() }, dados); S.pets.push(novo); S.ativo = novo.id; tab = 'inicio'; }
        salvar();
      } });
  }

  function formVac(v) {
    const p = petAtivo();
    abrirFolha({ titulo: v ? 'Editar' : 'Nova vacina ou vermífugo', campos: [
      { name: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_VAC, value: v ? v.tipo : 'vacina' },
      { name: 'nome', label: 'Nome', value: v && v.nome, req: true, ph: 'Ex.: V10, Antirrábica' },
      [{ name: 'aplicada', label: 'Aplicada em', type: 'date', value: v && v.aplicada }, { name: 'proxima', label: 'Próxima dose', type: 'date', value: v && v.proxima }]],
      excluir: v && (() => { S.vacinas = S.vacinas.filter(x => x.id !== v.id); }),
      aoSalvar(d) {
        const dados = { tipo: d.tipo, nome: d.nome.trim(), aplicada: d.aplicada || null, proxima: d.proxima || null };
        if (v) Object.assign(v, dados); else S.vacinas.push(Object.assign({ id: uid(), petId: p.id }, dados));
        if (dados.aplicada === hoje()) { tocou(); setTimeout(festa, 250); }
        salvar();
      } });
  }

  function formGasto(g) {
    const p = petAtivo();
    abrirFolha({ titulo: g ? 'Editar gasto' : 'Novo gasto', campos: [
      { name: 'valor', label: 'Valor (R$)', type: 'num', value: g && String(g.valor).replace('.', ','), req: true, ph: '0,00' },
      { name: 'cat', label: 'Categoria', type: 'select', options: CATEG, value: g ? g.cat : 'racao' },
      { name: 'desc', label: 'Descrição (opcional)', value: g && g.desc },
      { name: 'data', label: 'Data', type: 'date', value: g ? g.data : hoje(), req: true }],
      excluir: g && (() => { S.gastos = S.gastos.filter(x => x.id !== g.id); }),
      aoSalvar(d) {
        const val = num(d.valor);
        if (!val || val <= 0) { aviso('Informe o valor do gasto.'); throw new Error('validacao'); }
        const dados = { cat: d.cat, valor: val, data: d.data, desc: d.desc.trim() };
        if (g) Object.assign(g, dados); else S.gastos.push(Object.assign({ id: uid(), petId: p.id }, dados));
        if (!g) { tocou(); setTimeout(festa, 250); }
        salvar();
      } });
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const i = el.dataset.act.indexOf(':'), a = i < 0 ? el.dataset.act : el.dataset.act.slice(0, i), arg = i < 0 ? undefined : el.dataset.act.slice(i + 1);
    if (acoes[a]) acoes[a](arg);
  });
  document.addEventListener('change', e => {
    if (e.target.id !== 'arq' || !e.target.files[0]) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj || !Array.isArray(obj.pets)) throw new Error('formato');
        if (confirm('Substituir os dados deste aparelho pelo backup?')) { S = Object.assign(vazio(), obj); salvar(); tab = 'inicio'; render(); aviso('Backup importado'); }
      } catch (err) { aviso('Esse arquivo não parece um backup do Baby Pet.'); }
    };
    r.readAsText(e.target.files[0]);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
