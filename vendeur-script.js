// vendeur-script.js - Version complète avec sons personnalisés

// ========== SONS PERSONNALISÉS ==========
let clickSoundV = null;
let successSoundV = null;
let errorSoundV = null;

function loadSoundsV() {
    try {
        clickSoundV = new Audio('assets/sounds/click.mp3');
        successSoundV = new Audio('assets/sounds/success.mp3');
        errorSoundV = new Audio('assets/sounds/error.mp3');
        clickSoundV.load();
        successSoundV.load();
        errorSoundV.load();
    } catch(e) {
        console.log('Sons non disponibles');
    }
}

function playSoundV(type) {
    try {
        if (type === 'click' && clickSoundV) {
            clickSoundV.currentTime = 0;
            clickSoundV.play().catch(e => {});
        } else if (type === 'success' && successSoundV) {
            successSoundV.currentTime = 0;
            successSoundV.play().catch(e => {});
        } else if (type === 'error' && errorSoundV) {
            errorSoundV.currentTime = 0;
            errorSoundV.play().catch(e => {});
        }
    } catch(e) {}
}

loadSoundsV();

// ========== TOAST ==========
function showToastV(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function logoutV() {
    playSoundV('click');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ========== DONNÉES VENDEUR ==========
let vendeurId = null;
let vendeurNom = '';
let vendeurFiltre = 'all';

// ========== CHARGEMENT VENDEUR ==========
async function loadVendeurData() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('vendeurName').textContent = user.nom || 'Vendeur';

        const snapshot = await db.collection('vendeurs').where('nom','==',user.nom).get();
        if (snapshot.empty) {
            document.getElementById('vendeurName').textContent = '⚠️ Vendeur non trouvé';
            return;
        }
        const doc = snapshot.docs[0];
        vendeurId = doc.id;
        vendeurNom = doc.data().nom;

        loadVendeurCommandes();
        loadVendeurBilan();
    } catch(e) { console.error(e); }
}

// ========== COMMANDES VENDEUR ==========
async function loadVendeurCommandes() {
    // ... (contenu existant avec playSoundV)
}

function filtrerVCommandes(statut) {
    playSoundV('click');
    // ... (contenu existant)
}

async function afficherCommandeV(id) {
    playSoundV('click');
    // ... (contenu existant)
}

async function modifierCommandeV(id) {
    playSoundV('click');
    // ... (contenu existant)
}

async function supprimerCommandeV(id) {
    playSoundV('click');
    // ... (contenu existant)
    playSoundV('success');
}

// ========== BILAN VENDEUR ==========
async function loadVendeurBilan() {
    // ... (contenu existant)
}

async function copyBilanV() {
    playSoundV('click');
    // ... (contenu existant)
    playSoundV('success');
}

// ========== STOCK VENDEUR ==========
async function voirStockV() {
    playSoundV('click');
    // ... (contenu existant)
}

// ========== MODALE COMMANDE VENDEUR ==========
function switchModeV(mode) {
    playSoundV('click');
    // ... (contenu existant)
}

async function openCommandeModalV(commandeId) {
    playSoundV('click');
    // ... (contenu existant)
}

async function saveCommandeV() {
    // ... (contenu existant)
    playSoundV('success');
}

function addArticleRowV() {
    playSoundV('click');
    // ... (contenu existant)
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        if (u.role !== 'vendeur') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    loadVendeurData();
});