/* ══════════════════════════════════════
   BVOTE — index.js
   All JavaScript for the BVote frontend
══════════════════════════════════════ */

const API = 'https://bvote-production.up.railway.app';

// ── STATE ──
let token      = localStorage.getItem('bvote_token');
let userWallet = localStorage.getItem('bvote_wallet');
let userRole   = parseInt(localStorage.getItem('bvote_role') || '0');
let selectedElectionId  = null;
let selectedCandidateId = null;

/* ══════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════ */
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (btn) btn.classList.add('active');

  if (name === 'home')      loadHomeStats();
  if (name === 'elections') loadElections();
  if (name === 'vote')      loadOpenElections();
  if (name === 'admin')     loadAdminData();
  if (name === 'results')   loadResultsElections();
}

/* ══════════════════════════════════════
   API HELPER
══════════════════════════════════════ */
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

/* ══════════════════════════════════════
   ALERT HELPER
══════════════════════════════════════ */
function alertHTML(type, icon, msg) {
  return `<div class="alert alert-${type}">
    <span class="alert-icon">${icon}</span>
    <div>${msg}</div>
  </div>`;
}

/* ══════════════════════════════════════
   WALLET & AUTH
══════════════════════════════════════ */
async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask not found. Install it from metamask.io');
    return;
  }
  try {
    const accounts  = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const wallet    = accounts[0];
    const message   = `BVote Login: ${Date.now()}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, wallet]
    });

    const data = await api('POST', '/api/auth/login', { wallet, signature, message });

    if (data.success) {
      token      = data.data.token;
      userWallet = data.data.wallet;
      userRole   = data.data.role;
      localStorage.setItem('bvote_token',  token);
      localStorage.setItem('bvote_wallet', userWallet);
      localStorage.setItem('bvote_role',   userRole);
      updateUI();
      loadHomeStats();
    }
  } catch (err) {
    console.error('Login failed:', err);
  }
}

function updateUI() {
  if (!userWallet) return;

  // Wallet chip
  const short = userWallet.slice(0, 6) + '...' + userWallet.slice(-4);
  document.getElementById('walletText').textContent    = short;
  document.getElementById('walletChip').style.display  = 'flex';

  // Connect button
  const btn = document.getElementById('connectBtn');
  btn.textContent       = '✓ Connected';
  btn.style.background  = '#1a6b3c';
  btn.style.color       = 'white';

  // Hero button
  const heroBtn = document.getElementById('heroBtn');
  heroBtn.textContent = '✓ Wallet Connected';
  heroBtn.disabled    = true;

  // Role tag
  const roleNames   = ['Guest', 'Voter', 'Auditor', 'Admin', 'SuperAdmin'];
  const roleClasses = ['', 'voter', '', 'admin', 'superadmin'];
  const tag         = document.getElementById('roleTag');
  tag.textContent       = roleNames[userRole] || 'Guest';
  tag.className         = `role-tag ${roleClasses[userRole] || ''}`;
  tag.style.display     = 'inline-block';

  // Show nav items based on role
  if (userRole >= 1) document.getElementById('voteNavBtn').style.display  = 'inline-block';
  if (userRole >= 3) document.getElementById('adminNavBtn').style.display = 'inline-block';
}

/* ══════════════════════════════════════
   HOME — STATS
══════════════════════════════════════ */
async function loadHomeStats() {
  try {
    const data = await api('GET', '/api/public/info');
    if (data.success) {
      document.getElementById('statVoters').textContent    = data.data.totalVoters;
      document.getElementById('statElections').textContent = data.data.totalElections;
      document.getElementById('statCandidates').textContent= data.data.totalCandidates;
      document.getElementById('contractBadge').innerHTML   =
        `<a href="https://amoy.polygonscan.com/address/${data.data.superAdmin}"
            target="_blank"
            style="color:var(--gold);text-decoration:none;font-size:0.7rem">
          ↗ View Contract on Polygonscan
        </a>`;
    }
  } catch (err) { console.error(err); }
}

/* ══════════════════════════════════════
   ELECTIONS PAGE view and load
══════════════════════════════════════ */
async function loadElections() {
  document.getElementById('electionsLoading').style.display = 'block';
  document.getElementById('electionsList').innerHTML = '';

  try {
    const data = await api('GET', '/api/public/elections');
    document.getElementById('electionsLoading').style.display = 'none';

    if (!data.success || !data.data.length) {
      document.getElementById('electionsList').innerHTML =
        '<p style="color:var(--muted)">No elections found.</p>';
      return;
    }

    const badges = [
      '<span class="badge badge-pending">Pending</span>',
      '<span class="badge badge-open">Open</span>',
      '<span class="badge badge-closed">Closed</span>',
      '<span class="badge badge-cancelled">Cancelled</span>'
    ];

    document.getElementById('electionsList').innerHTML = data.data.map(e => `
      <div class="election-card">
        <div class="election-card-top">
          <h4>${e.name}</h4>
          ${badges[e.status] || ''}
        </div>
        <div class="election-card-body">
          <p style="color:var(--muted);font-size:0.875rem;margin-bottom:1rem">
            ${e.description || 'No description provided'}
          </p>
          <div class="election-meta">
            Start: ${new Date(e.startTime * 1000).toLocaleString()}<br>
            End:&nbsp;&nbsp;${new Date(e.endTime * 1000).toLocaleString()}<br>
            Votes: ${e.totalVotes}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('electionsLoading').style.display = 'none';
    console.error(err);
  }
}

/* ══════════════════════════════════════
   VOTER REGISTRATION
══════════════════════════════════════ */
async function registerVoter() {
  const name     = document.getElementById('regName').value.trim();
  const id       = document.getElementById('regId').value.trim();
  const district = document.getElementById('regDistrict').value.trim();
  const alertEl  = document.getElementById('registerAlert');

  if (!name || !id) {
    alertEl.innerHTML = alertHTML('error', '⚠', 'Name and National ID are required.');
    return;
  }
  if (!userWallet) {
    alertEl.innerHTML = alertHTML('error', '⚠', 'Please connect your wallet first.');
    return;
  }

  const btn = document.getElementById('regBtn');
  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const data = await api('POST', '/api/voter/register', {
      fullName: name, nationalId: id, district
    });

    if (data.success) {
      alertEl.innerHTML = alertHTML('success', '✓',
        `Registration submitted!
         <a class="tx-link"
            href="https://amoy.polygonscan.com/tx/${data.data.txHash}"
            target="_blank">View transaction ↗</a>`
      );
    } else {
      alertEl.innerHTML = alertHTML('error', '✕', data.error);
    }
  } catch (err) {
    alertEl.innerHTML = alertHTML('error', '✕', err.message);
  }

  btn.disabled    = false;
  btn.textContent = 'Submit Registration';
}

async function checkStatus() {
  if (!userWallet) {
    document.getElementById('statusResult').innerHTML =
      alertHTML('error', '⚠', 'Connect your wallet first.');
    return;
  }
  try {
    const data = await api('GET', `/api/voter/status/${userWallet}`);
    if (data.success) {
      const types = ['', 'info', 'success', 'error', 'error'];
      document.getElementById('statusResult').innerHTML = alertHTML(
        types[data.data.status] || 'info', '●',
        `<strong>${data.data.fullName}</strong> — ${data.data.statusText} — ${data.data.district}`
      );
    } else {
      document.getElementById('statusResult').innerHTML =
        alertHTML('info', '●', 'Not registered yet.');
    }
  } catch (err) {
    document.getElementById('statusResult').innerHTML =
      alertHTML('error', '✕', err.message);
  }
}

/* ══════════════════════════════════════
   VOTE PAGE
══════════════════════════════════════ */
async function loadOpenElections() {
  const el = document.getElementById('openElectionsList');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  document.getElementById('voteAlert').innerHTML = '';

  try {
    const data = await api('GET', '/api/voter/elections');

    if (!data.success || !data.data?.length) {
      el.innerHTML = '<p style="color:var(--muted)">No open elections at this time.</p>';
      return;
    }

    el.innerHTML = data.data.map(e => `
      <div class="election-card">
        <div class="election-card-top">
          <h4>${e.name}</h4>
          <span class="badge badge-open">Open</span>
        </div>
        <div class="election-card-body">
          <p style="color:var(--muted);font-size:0.875rem;margin-bottom:1rem">
            ${e.description || ''}
          </p>
          <div class="election-meta" style="margin-bottom:1rem">
            Closes: ${new Date(e.endTime * 1000).toLocaleString()}
          </div>
          ${e.hasVoted
            ? alertHTML('success', '✓', 'You have voted in this election.')
            : `<button class="btn btn-gold" onclick="openVoteModal(${e.id}, '${e.name}')">
                 Cast Your Vote →
               </button>`
          }
        </div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = alertHTML('error', '✕', err.message);
  }
}

async function openVoteModal(electionId, electionName) {
  selectedElectionId  = electionId;
  selectedCandidateId = null;

  document.getElementById('modalTitle').textContent    = electionName;
  document.getElementById('modalAlert').innerHTML      = '';
  document.getElementById('submitVoteBtn').disabled    = true;
  document.getElementById('submitVoteBtn').textContent = 'Cast Vote';

  const data = await api('GET', '/api/public/candidates');

  document.getElementById('modalCandidates').innerHTML = (data.data || []).map(c => `
    <div class="candidate-option" id="cand-${c.id}" onclick="selectCandidate(${c.id})">
      <div class="candidate-radio"></div>
      <div>
        <div class="candidate-name">${c.fullName}</div>
        <div class="candidate-party">${c.party} — ${c.position}</div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--muted)">No candidates found.</p>';

  document.getElementById('voteModal').classList.add('open');
}

function selectCandidate(id) {
  document.querySelectorAll('.candidate-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('cand-' + id).classList.add('selected');
  selectedCandidateId = id;
  document.getElementById('submitVoteBtn').disabled = false;
}

async function submitVote() {
  if (!selectedElectionId || !selectedCandidateId) return;

  const btn = document.getElementById('submitVoteBtn');
  btn.disabled    = true;
  btn.textContent = 'Casting vote...';

  try {
    const data = await api('POST', '/api/voter/vote', {
      electionId:  selectedElectionId,
      candidateId: selectedCandidateId
    });

    if (data.success) {
      document.getElementById('modalAlert').innerHTML = alertHTML('success', '✓',
        `Vote cast! <a class="tx-link"
           href="https://amoy.polygonscan.com/tx/${data.data.txHash}"
           target="_blank">View on blockchain ↗</a>`
      );
      setTimeout(() => { closeModal(); loadOpenElections(); }, 3000);
    } else {
      document.getElementById('modalAlert').innerHTML = alertHTML('error', '✕', data.error);
      btn.disabled    = false;
      btn.textContent = 'Cast Vote';
    }
  } catch (err) {
    document.getElementById('modalAlert').innerHTML = alertHTML('error', '✕', err.message);
    btn.disabled    = false;
    btn.textContent = 'Cast Vote';
  }
}

function closeModal() {
  document.getElementById('voteModal').classList.remove('open');
}

/* ══════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════ */
async function loadAdminData() {
  await loadAdminVoters();
  await loadAdminElections();
}

async function loadAdminVoters() {
  document.getElementById('adminVotersLoading').style.display = 'block';
  document.getElementById('votersTableWrap').style.display    = 'none';

  try {
    const data = await api('GET', '/api/admin/voters');
    document.getElementById('adminVotersLoading').style.display = 'none';
    document.getElementById('votersTableWrap').style.display    = 'block';

    if (!data.success) return;

    document.getElementById('votersBody').innerHTML = data.data.map(v => `
      <tr>
        <td><strong>${v.fullName}</strong></td>
        <td style="font-family:'DM Mono',monospace;font-size:0.78rem;color:var(--muted)">
          ${v.wallet.slice(0, 10)}...${v.wallet.slice(-6)}
        </td>
        <td>${v.district || '—'}</td>
        <td>${voterStatusBadge(v.status, v.statusText)}</td>
        <td>
          <div class="td-actions">
            ${v.status !== 2
              ? `<button class="btn btn-green btn-sm" onclick="setVoterStatus('${v.wallet}', 2)">Approve</button>`
              : ''}
            ${v.status !== 3
              ? `<button class="btn btn-red btn-sm" onclick="setVoterStatus('${v.wallet}', 3)">Reject</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    document.getElementById('adminVotersLoading').style.display = 'none';
    console.error(err);
  }
}

function voterStatusBadge(status, text) {
  const map = { 1: 'badge-pending', 2: 'badge-open', 3: 'badge-cancelled', 4: 'badge-cancelled' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${text}</span>`;
}

async function setVoterStatus(wallet, status) {
  try {
    const data = await api('POST', '/api/admin/voter/approve', { wallet, status });
    if (data.success) loadAdminVoters();
    else alert(data.error);
  } catch (err) { alert(err.message); }
}

async function addCandidate() {
  const name     = document.getElementById('candName').value.trim();
  const party    = document.getElementById('candParty').value.trim();
  const position = document.getElementById('candPosition').value.trim();
  const alertEl  = document.getElementById('candAlert');

  if (!name || !party || !position) {
    alertEl.innerHTML = alertHTML('error', '⚠', 'All fields are required.');
    return;
  }

  try {
    const data = await api('POST', '/api/admin/candidate/add', {
      fullName: name, party, position
    });
    if (data.success) {
      alertEl.innerHTML = alertHTML('success', '✓', 'Candidate added successfully.');
      document.getElementById('candName').value     = '';
      document.getElementById('candParty').value    = '';
      document.getElementById('candPosition').value = '';
    } else {
      alertEl.innerHTML = alertHTML('error', '✕', data.error);
    }
  } catch (err) {
    alertEl.innerHTML = alertHTML('error', '✕', err.message);
  }
}

async function createElection() {
  const name    = document.getElementById('elecName').value.trim();
  const desc    = document.getElementById('elecDesc').value.trim();
  const start   = document.getElementById('elecStart').value;
  const end     = document.getElementById('elecEnd').value;
  const candIds = document.getElementById('elecCandIds').value
    .split(',').map(x => parseInt(x.trim())).filter(Boolean);
  const alertEl = document.getElementById('elecAlert');

  if (!name || !start || !end || !candIds.length) {
    alertEl.innerHTML = alertHTML('error', '⚠', 'All fields are required.');
    return;
  }

  try {
    const data = await api('POST', '/api/admin/election/create', {
      name,
      description:  desc,
      startTime:    Math.floor(new Date(start).getTime() / 1000),
      endTime:      Math.floor(new Date(end).getTime() / 1000),
      candidateIds: candIds
    });
    if (data.success) {
      alertEl.innerHTML = alertHTML('success', '✓', 'Election created successfully!');
      loadAdminElections();
    } else {
      alertEl.innerHTML = alertHTML('error', '✕', data.error);
    }
  } catch (err) {
    alertEl.innerHTML = alertHTML('error', '✕', err.message);
  }
}

async function loadAdminElections() {
  try {
    const data = await api('GET', '/api/public/elections');
    if (!data.success) return;

    const badgeClass = ['badge-pending', 'badge-open', 'badge-closed', 'badge-cancelled'];
    const labels     = ['Pending', 'Open', 'Closed', 'Cancelled'];

    document.getElementById('adminElectionsBody').innerHTML = data.data.map(e => `
      <tr>
        <td><span style="font-family:'DM Mono',monospace;font-size:0.8rem">#${e.id}</span></td>
        <td><strong>${e.name}</strong></td>
        <td><span class="badge ${badgeClass[e.status]}">${labels[e.status]}</span></td>
        <td>${e.totalVotes}</td>
        <td>
          <div class="td-actions">
            ${e.status === 0
              ? `<button class="btn btn-green btn-sm" onclick="setElectionStatus(${e.id}, 1)">Open</button>`
              : ''}
            ${e.status === 1
              ? `<button class="btn btn-primary btn-sm" onclick="setElectionStatus(${e.id}, 2)">Close</button>`
              : ''}
            ${e.status === 2 && !e.resultsPublished
              ? `<button class="btn btn-gold btn-sm" onclick="publishResults(${e.id})">Publish</button>`
              : ''}
            ${e.status !== 3
              ? `<button class="btn btn-red btn-sm" onclick="setElectionStatus(${e.id}, 3)">Cancel</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function setElectionStatus(id, status) {
  try {
    const data = await api('PATCH', `/api/admin/election/${id}/status`, { status });
    if (data.success) loadAdminElections();
    else alert(data.error);
  } catch (err) { alert(err.message); }
}

async function publishResults(id) {
  try {
    const data = await api('POST', `/api/admin/election/${id}/publish`);
    if (data.success) loadAdminElections();
    else alert(data.error);
  } catch (err) { alert(err.message); }
}

/* ══════════════════════════════════════
   RESULTS PAGE
══════════════════════════════════════ */
async function loadResultsElections() {
  try {
    const data     = await api('GET', '/api/public/elections');
    if (!data.success) return;

    const published = data.data.filter(e => e.resultsPublished);
    const select    = document.getElementById('resultsSelect');

    select.innerHTML = '<option value="">— Choose an election —</option>' +
      published.map(e => `<option value="${e.id}">${e.name}</option>`).join('');

    if (!published.length) {
      document.getElementById('resultsContent').innerHTML = alertHTML(
        'info', 'ℹ',
        'No published results yet. Results are published by the admin after an election closes.'
      );
    }
  } catch (err) { console.error(err); }
}

async function loadResults() {
  const id = document.getElementById('resultsSelect').value;
  if (!id) return;

  const el = document.getElementById('resultsContent');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading results...</div>';

  try {
    const data = await api('GET', `/api/public/results/${id}`);

    if (!data.success) {
      el.innerHTML = alertHTML('error', '✕', data.error);
      return;
    }

    const total = data.data.totalVotes || 1;

    el.innerHTML = `
      <div class="card">
        <div class="card-title">
          <div class="card-icon">🏆</div>
          ${data.data.name}
        </div>
        <p style="color:var(--muted);margin-bottom:2rem;font-size:0.875rem">
          Total votes cast: <strong>${data.data.totalVotes}</strong>
        </p>
        ${data.data.results.map((r, i) => `
          <div class="result-item">
            <div class="result-top">
              <div class="result-name">
                ${i === 0 ? '🏆 ' : ''}
                ${r.fullName}
                <span class="result-party">${r.party}</span>
              </div>
              <div class="result-votes">
                ${r.votes} votes · ${Math.round(r.votes / total * 100)}%
              </div>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${i === 0 ? 'winner' : ''}"
                   style="width:${Math.round(r.votes / total * 100)}%">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    el.innerHTML = alertHTML('error', '✕', err.message);
  }
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
if (userWallet) updateUI();
loadHomeStats();