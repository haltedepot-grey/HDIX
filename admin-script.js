// admin-script.js - Version ultime complète (Partie 1)

// ============================================
// SONS
// ============================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        if (type === 'click') {
            oscillator.frequency.value = 600;
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'success') {
            oscillator.frequency.value = 880;
            oscillator.start();
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.frequency.value = 1100;
                osc2.type = 'sine';
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.05);
            }, 100);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
            oscillator.frequency.value = 300;
            oscillator.type = 'sawtooth';
            gainNode.gain.value = 0.2;
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        }
    } catch(e) {}
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
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

// ============================================
// DONNÉES COMMANDE
// ============================================
let commandeData = {
    vendeurId: '',
    vendeurNom: '',
    articles: [],
    prixTotal: 0,
    fraisInclus: true,
    fraisLivraison: 0,
    zoneLivraison: '',
    quartier: '',
    ville: '',
    note: ''
};

let currentStep = 0;
const totalSteps = 7;

// ============================================
// NAVIGATION
// ============================================
function showSection(section) {
    playSound('click');
    document.querySelectorAll('.section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${section}`).style.display = 'block';
    document.querySelector(`.nav-btn[onclick="showSection('${section}')"]`).classList.add('active');
    if (section === 'vendeurs') loadVendeurs();
    if (section === 'livreurs') loadLivreurs();
    if (section === 'stockage') loadStockage();
    if (section === 'inscriptions') loadInscriptions();
    if (section === 'appels') loadAppels();
}

function logout() {
    playSound('click');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ============================================
// WIZARD COMMANDE
// ============================================
async function openWizard() {
    playSound('click');
    resetWizard();
    document.getElementById('wizardModal').classList.add('active');
    currentStep = 0;
    showStep(0);
    await loadVendeursForWizard();
}

function closeWizard() {
    playSound('click');
    document.getElementById('wizardModal').classList.remove('active');
    resetWizard();
}

document.getElementById('wizardModal').addEventListener('click', function(e) {
    if (e.target === this) closeWizard();
});

function showStep(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const target = document.querySelector(`.step[data-step="${step}"]`);
    if (target) target.classList.add('active');
}

function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        showStep(currentStep);
        if (currentStep === 6) updateRecap();
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
}

function resetWizard() {
    commandeData = {
        vendeurId: '',
        vendeurNom: '',
        articles: [],
        prixTotal: 0,
        fraisInclus: true,
        fraisLivraison: 0,
        zoneLivraison: '',
        quartier: '',
        ville: '',
        note: ''
    };
    document.getElementById('articlesContainer').innerHTML = '';
    addArticleRow();
    document.getElementById('prixTotal').value = '';
    document.getElementById('fraisInclus').checked = true;
    document.getElementById('zoneSelect').value = '';
    document.getElementById('quartierInput').value = '';
    document.getElementById('villeInput').value = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('vendeurSelect').value = '';
}

// ============================================
// ARTICLES
// ============================================
function addArticleRow() {
    playSound('click');
    const container = document.getElementById('articlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `
        <input type="number" class="article-qty" placeholder="Qté" min="1" value="1" />
        <input type="text" class="article-name" placeholder="Nom de l'article" />
    `;
    container.appendChild(row);
}

function getArticles() {
    const rows = document.querySelectorAll('.article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name !== '') {
            articles.push({ quantite: parseInt(qty) || 1, nom: name });
        }
    });
    return articles;
}

// ============================================
// VENDEURS DANS WIZARD
// ============================================
async function loadVendeursForWizard() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const select = document.getElementById('vendeurSelect');
        select.innerHTML = '<option value="">-- Sélectionnez un vendeur --</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.nom;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement vendeurs:', error);
    }
}

function addVendeurFromWizard() {
    playSound('click');
    const nom = prompt('Nom du nouveau vendeur :');
    if (!nom) return;
    const telephone = prompt('Numéro de téléphone :');
    if (!telephone) return;
    const abreviation = prompt('Abréviation (ex: MODE) :');
    if (!abreviation) return;
    
    db.collection('vendeurs').add({
        nom: nom,
        telephone: telephone,
        abreviation: abreviation.toUpperCase()
    }).then(() => {
        playSound('success');
        showToast('✅ Vendeur ajouté avec succès !', 'success');
        loadVendeursForWizard();
    }).catch(error => {
        playSound('error');
        showToast('❌ Erreur lors de l\'ajout.', 'error');
    });
}

// ============================================
// VALIDATION DES ÉTAPES
// ============================================
function validateStep(step) {
    switch(step) {
        case 0:
            const vendeurSelect = document.getElementById('vendeurSelect');
            const vendeurId = vendeurSelect.value;
            if (!vendeurId) {
                playSound('error');
                showToast('⚠️ Veuillez sélectionner un vendeur.', 'error');
                return;
            }
            commandeData.vendeurId = vendeurId;
            commandeData.vendeurNom = vendeurSelect.options[vendeurSelect.selectedIndex].textContent;
            playSound('success');
            nextStep();
            break;
        case 1:
            const articles = getArticles();
            if (articles.length === 0) {
                playSound('error');
                showToast('⚠️ Veuillez ajouter au moins un article.', 'error');
                return;
            }
            commandeData.articles = articles;
            playSound('success');
            nextStep();
            break;
        case 2:
            const prix = parseInt(document.getElementById('prixTotal').value);
            if (isNaN(prix) || prix <= 0) {
                playSound('error');
                showToast('⚠️ Veuillez saisir un prix valide.', 'error');
                return;
            }
            commandeData.prixTotal = prix;
            commandeData.fraisInclus = document.getElementById('fraisInclus').checked;
            playSound('success');
            if (commandeData.fraisInclus) {
                currentStep = 4;
                showStep(4);
            } else {
                nextStep();
            }
            break;
        case 3:
            const zone = document.getElementById('zoneSelect').value;
            if (!zone) {
                playSound('error');
                showToast('⚠️ Veuillez sélectionner une zone de livraison.', 'error');
                return;
            }
            const zones = {
                'Libreville': 2000,
                'Akanda': 3000,
                'Owendo': 3000,
                'Bikélé': 3000,
                'Autres': 4000
            };
            commandeData.fraisLivraison = zones[zone] || 0;
            commandeData.zoneLivraison = zone;
            playSound('success');
            nextStep();
            break;
        case 4:
            const quartier = document.getElementById('quartierInput').value.trim();
            const ville = document.getElementById('villeInput').value.trim();
            if (!quartier || !ville) {
                playSound('error');
                showToast('⚠️ Veuillez renseigner le quartier ET la ville.', 'error');
                return;
            }
            commandeData.quartier = quartier;
            commandeData.ville = ville;
            playSound('success');
            nextStep();
            break;
        case 5:
            commandeData.note = document.getElementById('noteInput').value.trim();
            playSound('success');
            nextStep();
            break;
    }
}

// ============================================
// RÉCAPITULATIF
// ============================================
function updateRecap() {
    const container = document.getElementById('recapContainer');
    const totalAvecLivraison = commandeData.prixTotal + 
        (commandeData.fraisInclus ? 0 : commandeData.fraisLivraison);
    
    let articlesHtml = commandeData.articles.map(a =>
        `  - ${a.quantite} x ${a.nom}`
    ).join('<br>');
    
    container.innerHTML = `
        <div class="recap-item"><span>Vendeur</span><span>${commandeData.vendeurNom}</span></div>
        <div class="recap-item"><span>Articles</span><span>${commandeData.articles.length} article(s)</span></div>
        <div class="recap-item" style="flex-direction:column;align-items:flex-start;padding:8px 0;">
            <strong>Détail :</strong>
            <span>${articlesHtml}</span>
        </div>
        <div class="recap-item"><span>Prix total</span><span>${commandeData.prixTotal} FCFA</span></div>
        <div class="recap-item"><span>Frais livraison</span><span>${commandeData.fraisInclus ? 'Inclus' : commandeData.fraisLivraison + ' FCFA'}</span></div>
        <div class="recap-item"><span>Zone</span><span>${commandeData.zoneLivraison || 'Non spécifiée'}</span></div>
        <div class="recap-item"><span>Lieu</span><span>${commandeData.quartier}, ${commandeData.ville}</span></div>
        ${commandeData.note ? `<div class="recap-item"><span>Note</span><span>${commandeData.note}</span></div>` : ''}
        <div class="recap-item" style="font-weight:bold;border-top:2px solid #1a2b4c;padding-top:12px;margin-top:8px;">
            <span>Total TTC</span>
            <span>${totalAvecLivraison} FCFA</span>
        </div>
    `;
}

// ============================================
// ENREGISTREMENT COMMANDE
// ============================================
async function saveCommande() {
    try {
        const snapshot = await db.collection('commandes').get();
        const count = snapshot.size + 1;
        const numero = `HDIX-${String(count).padStart(3, '0')}`;
        
        await db.collection('commandes').add({
            numero: numero,
            vendeurId: commandeData.vendeurId,
            vendeur: commandeData.vendeurNom,
            articles: commandeData.articles,
            prixTotal: commandeData.prixTotal,
            fraisLivraison: commandeData.fraisInclus ? 0 : commandeData.fraisLivraison,
            fraisInclus: commandeData.fraisInclus,
            zone: commandeData.zoneLivraison,
            quartier: commandeData.quartier,
            ville: commandeData.ville,
            note: commandeData.note,
            statut: 'À appeler',
            dateCreation: new Date(),
            admin: 'Admin'
        });
        
        playSound('success');
        showToast(`✅ Commande ${numero} enregistrée !`, 'success');
        closeWizard();
        loadCommandes();
        loadAppels();
    } catch (error) {
        console.error('Erreur:', error);
        playSound('error');
        showToast('❌ Erreur lors de l\'enregistrement.', 'error');
    }
}
// admin-script.js - Version ultime (Partie 2)

// ============================================
// CHARGEMENT DES COMMANDES
// ============================================
async function loadCommandes() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const snapshot = await db.collection('commandes')
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow)
            .orderBy('dateCreation', 'desc')
            .get();
        
        const container = document.getElementById('commandesContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande enregistrée aujourd\'hui.</p>';
            updateStats(0, 0, 0);
            return;
        }
        
        let html = '';
        let appeler = 0, livree = 0, total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            if (data.statut === 'À appeler') appeler++;
            if (data.statut === 'Livrée') livree++;
            const statutClass = data.statut === 'Livrée' ? 'statut-livree' : 
                               data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            html += `
                <div class="commande-item">
                    <span class="commande-numero">${data.numero}</span>
                    <span class="commande-client">${data.vendeur}</span>
                    <span class="commande-montant">${data.prixTotal} FCFA</span>
                    <span class="commande-statut ${statutClass}">${data.statut}</span>
                    ${data.statut !== 'Livrée' ? `<button onclick="assignerCommande('${doc.id}')" class="btn-assign">🚚 Assigner</button>` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
        updateStats(appeler, livree, total);
    } catch (error) {
        console.error('Erreur chargement:', error);
    }
}

function updateStats(appeler, livree, total) {
    document.getElementById('statAppeler').textContent = appeler;
    document.getElementById('statLivree').textContent = livree;
    document.getElementById('statTotal').textContent = total;
}

// ============================================
// ASSIGNER UN LIVREUR
// ============================================
async function assignerCommande(commandeId) {
    try {
        const livreursSnapshot = await db.collection('livreurs')
            .where('actif', '==', true)
            .get();
        
        if (livreursSnapshot.empty) {
            showToast('⚠️ Aucun livreur disponible.', 'error');
            return;
        }
        
        let livreursList = [];
        livreursSnapshot.forEach(doc => {
            livreursList.push({ id: doc.id, ...doc.data() });
        });
        
        let options = livreursList.map((l, index) => 
            `${index + 1}. ${l.nom} (${l.zone || 'Sans zone'})`
        ).join('\n');
        
        const choix = prompt(
            `Sélectionnez un livreur pour cette commande :\n\n${options}\n\nEntrez le numéro :`
        );
        
        if (!choix) return;
        
        const index = parseInt(choix) - 1;
        if (isNaN(index) || index < 0 || index >= livreursList.length) {
            showToast('⚠️ Sélection invalide.', 'error');
            return;
        }
        
        const livreur = livreursList[index];
        
        await db.collection('commandes').doc(commandeId).update({
            livreurId: livreur.id,
            livreurNom: livreur.nom,
            statut: 'En-cours',
            dateAssignation: new Date()
        });
        
        playSound('success');
        showToast(`✅ Commande assignée à ${livreur.nom} !`, 'success');
        loadCommandes();
        loadAppels();
    } catch (error) {
        console.error('Erreur assignation:', error);
        showToast('❌ Erreur lors de l\'assignation.', 'error');
    }
}

// ============================================
// GESTION DES VENDEURS
// ============================================
async function loadVendeurs() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const container = document.getElementById('vendeursList');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucun vendeur enregistré.</p>';
            return;
        }
        
        let html = '<div class="list-container">';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="list-item">
                    <div>
                        <strong>${data.nom}</strong>
                        <br><small>📞 ${data.telephone} | Code : ${data.abreviation || 'Non défini'}</small>
                    </div>
                    <div>
                        <button onclick="editVendeur('${doc.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteVendeur('${doc.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement vendeurs:', error);
    }
}

function openVendeurForm() {
    const nom = prompt('Nom du vendeur :');
    if (!nom) return;
    const telephone = prompt('Numéro de téléphone :');
    if (!telephone) return;
    const abreviation = prompt('Abréviation (ex: MODE) :');
    if (!abreviation) return;
    
    db.collection('vendeurs').add({
        nom: nom,
        telephone: telephone,
        abreviation: abreviation.toUpperCase()
    }).then(() => {
        playSound('success');
        showToast('✅ Vendeur ajouté avec succès !', 'success');
        loadVendeurs();
        loadVendeursForWizard();
        loadVendeursForBilan();
    }).catch(error => {
        playSound('error');
        showToast('❌ Erreur lors de l\'ajout.', 'error');
    });
}

async function deleteVendeur(id) {
    playSound('click');
    if (!confirm('Supprimer ce vendeur définitivement ?')) return;
    try {
        await db.collection('vendeurs').doc(id).delete();
        playSound('success');
        showToast('✅ Vendeur supprimé.', 'success');
        loadVendeurs();
        loadVendeursForWizard();
        loadVendeursForBilan();
    } catch (error) {
        playSound('error');
        showToast('❌ Erreur lors de la suppression.', 'error');
    }
}

async function editVendeur(id) {
    playSound('click');
    const doc = await db.collection('vendeurs').doc(id).get();
    const data = doc.data();
    
    const nom = prompt('Nom :', data.nom);
    if (!nom) return;
    const telephone = prompt('Téléphone :', data.telephone);
    if (!telephone) return;
    const abreviation = prompt('Abréviation :', data.abreviation);
    if (!abreviation) return;
    
    await db.collection('vendeurs').doc(id).update({
        nom: nom,
        telephone: telephone,
        abreviation: abreviation.toUpperCase()
    });
    
    playSound('success');
    showToast('✅ Vendeur modifié.', 'success');
    loadVendeurs();
    loadVendeursForWizard();
    loadVendeursForBilan();
}

// ============================================
// GESTION DES LIVREURS
// ============================================
async function loadLivreurs() {
    try {
        const snapshot = await db.collection('livreurs').orderBy('nom').get();
        const container = document.getElementById('livreursList');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucun livreur enregistré.</p>';
            return;
        }
        
        let html = '<div class="list-container">';
        snapshot.forEach(doc => {
            const data = doc.data();
            const statut = data.actif ? '✅ Actif' : '⛔ Inactif';
            html += `
                <div class="list-item">
                    <div>
                        <strong>${data.nom}</strong>
                        <br><small>📞 ${data.telephone} | Zone : ${data.zone || 'Non définie'} | ${statut}</small>
                    </div>
                    <div>
                        <button onclick="editLivreur('${doc.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteLivreur('${doc.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement livreurs:', error);
    }
}

function openLivreurForm() {
    const nom = prompt('Nom du livreur :');
    if (!nom) return;
    const telephone = prompt('Numéro de téléphone :');
    if (!telephone) return;
    const zone = prompt('Zone de livraison (Libreville, Akanda, Owendo, Bikélé) :');
    if (!zone) return;
    const capacite = parseInt(prompt('Capacité (nombre max de colis) :') || '10');
    const actif = confirm('Activer ce livreur immédiatement ?');
    
    db.collection('livreurs').add({
        nom: nom,
        telephone: telephone,
        zone: zone,
        capacite: capacite || 10,
        actif: actif
    }).then(() => {
        playSound('success');
        showToast('✅ Livreur ajouté avec succès !', 'success');
        loadLivreurs();
    }).catch(error => {
        playSound('error');
        showToast('❌ Erreur lors de l\'ajout.', 'error');
    });
}

async function deleteLivreur(id) {
    playSound('click');
    if (!confirm('Supprimer ce livreur définitivement ?')) return;
    try {
        await db.collection('livreurs').doc(id).delete();
        playSound('success');
        showToast('✅ Livreur supprimé.', 'success');
        loadLivreurs();
    } catch (error) {
        playSound('error');
        showToast('❌ Erreur lors de la suppression.', 'error');
    }
}

async function editLivreur(id) {
    playSound('click');
    const doc = await db.collection('livreurs').doc(id).get();
    const data = doc.data();
    
    const nom = prompt('Nom :', data.nom);
    if (!nom) return;
    const telephone = prompt('Téléphone :', data.telephone);
    if (!telephone) return;
    const zone = prompt('Zone :', data.zone || '');
    if (!zone) return;
    const capacite = parseInt(prompt('Capacité :', data.capacite || 10));
    const actif = confirm(`Actif ? (OK = Oui, Annuler = Non)`);
    
    await db.collection('livreurs').doc(id).update({
        nom: nom,
        telephone: telephone,
        zone: zone,
        capacite: capacite || 10,
        actif: actif
    });
    
    playSound('success');
    showToast('✅ Livreur modifié.', 'success');
    loadLivreurs();
}
// admin-script.js - Version ultime (Partie 3)

// ============================================
// APPELS CLIENTS (MODALE DE DÉFILÉ)
// ============================================
let fileAppel = [];
let indexAppel = 0;

async function loadAppels() {
    try {
        const snapshot = await db.collection('commandes')
            .where('statut', '==', 'À appeler')
            .orderBy('dateCreation', 'asc')
            .get();
        
        const container = document.getElementById('appelsContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande en attente d\'appel.</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="commande-item">
                    <span class="commande-numero">${data.numero}</span>
                    <span class="commande-client">${data.vendeur}</span>
                    <span class="commande-montant">${data.prixTotal} FCFA</span>
                    <span class="commande-statut statut-appel">${data.statut}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement appels:', error);
    }
}

function lancerAppelSuivant() {
    playSound('click');
    db.collection('commandes')
        .where('statut', '==', 'À appeler')
        .orderBy('dateCreation', 'asc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                showToast('✅ Aucune commande en attente d\'appel.', 'success');
                return;
            }
            
            fileAppel = [];
            snapshot.forEach(doc => {
                fileAppel.push({ id: doc.id, data: doc.data() });
            });
            indexAppel = 0;
            afficherAppel();
        })
        .catch(error => {
            console.error('Erreur:', error);
            showToast('❌ Erreur lors du chargement des appels.', 'error');
        });
}

function afficherAppel() {
    if (indexAppel >= fileAppel.length) {
        fermerAppelModal();
        showToast('✅ Tous les appels ont été traités !', 'success');
        loadAppels();
        loadCommandes();
        return;
    }
    
    const item = fileAppel[indexAppel];
    const data = item.data;
    const modal = document.getElementById('appelModal');
    const content = document.getElementById('appelContent');
    
    let articlesHtml = data.articles.map(a => `${a.quantite} x ${a.nom}`).join(', ');
    
    content.innerHTML = `
        <div class="step-title">📞 APPEL CLIENT</div>
        <div class="step-subtitle">Bon ${indexAppel + 1} sur ${fileAppel.length}</div>
        <div class="recap-item"><span>Commande</span><span>${data.numero}</span></div>
        <div class="recap-item"><span>Vendeur</span><span>${data.vendeur}</span></div>
        <div class="recap-item"><span>Articles</span><span>${articlesHtml}</span></div>
        <div class="recap-item"><span>Lieu</span><span>${data.quartier}, ${data.ville}</span></div>
        <div class="recap-item"><span>Montant</span><span>${data.prixTotal} FCFA</span></div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="appelerClient('${item.id}')" class="btn-primary" style="flex:1;">📞 Appeler</button>
            <button onclick="whatsappClient('${item.id}')" class="btn-primary" style="flex:1;background:#25D366;">💬 WhatsApp</button>
            <button onclick="smsClient('${item.id}')" class="btn-primary" style="flex:1;background:#8e44ad;">🤖 IA</button>
        </div>
        <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="validerAppel('${item.id}', 'Validé')" class="btn-success" style="flex:1;padding:12px;">✅ Validé</button>
            <button onclick="validerAppel('${item.id}', 'Reporté')" class="btn-secondary" style="flex:1;padding:12px;">📅 Reporté</button>
            <button onclick="validerAppel('${item.id}', 'Refusé')" class="btn-danger" style="flex:1;padding:12px;">❌ Refusé</button>
        </div>
        <p class="info-text">Une fois le statut choisi, le prochain bon apparaîtra automatiquement.</p>
    `;
    
    modal.classList.add('active');
}

function fermerAppelModal() {
    document.getElementById('appelModal').classList.remove('active');
}

document.getElementById('appelModal').addEventListener('click', function(e) {
    if (e.target === this) fermerAppelModal();
});

async function validerAppel(id, statut) {
    playSound('click');
    try {
        await db.collection('commandes').doc(id).update({
            statut: statut,
            dateAppel: new Date()
        });
        playSound('success');
        showToast(`✅ Commande ${statut}`, 'success');
        indexAppel++;
        afficherAppel();
        loadCommandes();
        loadAppels();
    } catch (error) {
        playSound('error');
        showToast('❌ Erreur lors de la mise à jour.', 'error');
    }
}

function appelerClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        // Simuler un appel (dans la vraie vie, on ouvrirait le téléphone)
        showToast(`📞 Appel en cours vers le client...`, 'info');
        setTimeout(() => {
            if (confirm(`Le client a-t-il répondu ?`)) {
                validerAppel(id, 'Validé');
            } else {
                showToast('📞 Client injoignable. Réessayez plus tard.', 'info');
            }
        }, 1500);
    });
}

function whatsappClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = prompt('Entrez le numéro WhatsApp du client :');
        if (phone) {
            window.open(`https://wa.me/${phone.replace('+', '')}?text=Bonjour, nous vous confirmons votre livraison.`, '_blank');
        }
    });
}

function smsClient(id) {
    playSound('click');
    db.collection('commandes').doc(id).get().then(doc => {
        const data = doc.data();
        const phone = prompt('Entrez le numéro du client :');
        if (phone) {
            const lien1 = `https://hdix.app/confirmation/${id}/ok`;
            const lien2 = `https://hdix.app/confirmation/${id}/appel`;
            const lien3 = `https://hdix.app/confirmation/${id}/non`;
            const message = `📦 Commande ${data.numero}\nConfirmez votre disponibilité :\n1. OK -> ${lien1}\n2. Appelez-moi -> ${lien2}\n3. Indisponible -> ${lien3}`;
            window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
        }
    });
}

// ============================================
// COLLAGE DEPUIS WHATSAPP
// ============================================
function openCollageWizard() {
    playSound('click');
    document.getElementById('collageModal').classList.add('active');
    document.getElementById('collageInput').value = '';
    document.getElementById('collageResult').innerHTML = '';
}

function closeCollageWizard() {
    document.getElementById('collageModal').classList.remove('active');
}

document.getElementById('collageModal').addEventListener('click', function(e) {
    if (e.target === this) closeCollageWizard();
});

function analyserCollage() {
    playSound('click');
    const text = document.getElementById('collageInput').value.trim();
    if (!text) {
        showToast('⚠️ Veuillez coller un texte.', 'error');
        return;
    }
    
    // Détection automatique du format (apprentissage)
    const result = analyserTexteCommande(text);
    const container = document.getElementById('collageResult');
    
    if (result.articles.length === 0) {
        container.innerHTML = `
            <div class="required-note" style="border-left-color:#c0392b;">
                ⚠️ Aucun article détecté. Vérifiez le format du texte.
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="margin-top:16px;">
            <h4>📋 Commande détectée</h4>
            <div class="recap-item"><span>Vendeur</span><span>${result.vendeur || 'Non détecté'}</span></div>
            <div class="recap-item"><span>Articles</span><span>${result.articles.length}</span></div>
            <div class="recap-item" style="flex-direction:column;align-items:flex-start;padding:8px 0;">
                <strong>Détail :</strong>
                <span>${result.articles.map(a => `${a.quantite} x ${a.nom}`).join('<br>')}</span>
            </div>
            <div class="recap-item"><span>Prix total</span><span>${result.prix || 'Non détecté'} FCFA</span></div>
            <div class="recap-item"><span>Lieu</span><span>${result.lieu || 'Non détecté'}</span></div>
            <div style="margin-top:16px;display:flex;gap:10px;">
                <button onclick="validerCollage()" class="btn-success" style="flex:1;padding:12px;">✅ Valider</button>
                <button onclick="closeCollageWizard()" class="btn-secondary" style="flex:1;padding:12px;">Annuler</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    // Stocker le résultat pour validation
    window._collageResult = result;
}

function validerCollage() {
    playSound('click');
    const result = window._collageResult;
    if (!result) return;
    
    // Pré-remplir le wizard avec les données détectées
    openWizard();
    
    // Remplir les articles
    const container = document.getElementById('articlesContainer');
    container.innerHTML = '';
    result.articles.forEach(a => {
        const row = document.createElement('div');
        row.className = 'article-row';
        row.innerHTML = `
            <input type="number" class="article-qty" value="${a.quantite}" min="1" />
            <input type="text" class="article-name" value="${a.nom}" />
        `;
        container.appendChild(row);
    });
    
    // Remplir le prix
    if (result.prix) {
        document.getElementById('prixTotal').value = result.prix;
    }
    
    // Remplir le lieu
    if (result.lieu) {
        const parts = result.lieu.split(',');
        if (parts.length >= 2) {
            document.getElementById('quartierInput').value = parts[0].trim();
            document.getElementById('villeInput').value = parts[1].trim();
        } else {
            document.getElementById('quartierInput').value = result.lieu;
        }
    }
    
    closeCollageWizard();
    showToast('✅ Données collées importées avec succès !', 'success');
}

function analyserTexteCommande(text) {
    // Détection simple des motifs (à améliorer avec l'apprentissage)
    const result = {
        articles: [],
        vendeur: '',
        prix: null,
        lieu: ''
    };
    
    // Détection des lignes (séparateur saut de ligne)
    const lines = text.split('\n').filter(l => l.trim());
    
    lines.forEach(line => {
        const trimmed = line.trim();
        
        // Détection d'un article (quantité + nom)
        const articleMatch = trimmed.match(/^(\d+)\s*[xX]?\s*(.+)$/);
        if (articleMatch) {
            result.articles.push({
                quantite: parseInt(articleMatch[1]),
                nom: articleMatch[2].trim()
            });
            return;
        }
        
        // Détection d'un prix
        const prixMatch = trimmed.match(/(\d+[\s']?\d*)\s*F?CFA?/i);
        if (prixMatch && !result.prix) {
            result.prix = parseInt(prixMatch[1].replace(/\s/g, ''));
            return;
        }
        
        // Détection d'un lieu
        if (trimmed.includes('ville') || trimmed.includes('quartier') || 
            trimmed.includes('Libreville') || trimmed.includes('Akanda') ||
            trimmed.includes('Owendo')) {
            result.lieu = trimmed;
            return;
        }
        
        // Détection d'un vendeur
        if (trimmed.includes('vendeur') || trimmed.includes('Vendeur')) {
            result.vendeur = trimmed.replace(/vendeur\s*/i, '').trim();
            return;
        }
    });
    
    // Si pas de lieu détecté, prendre la première ligne qui en contient
    if (!result.lieu) {
        for (const line of lines) {
            if (line.length > 3 && line.length < 50 && !result.lieu) {
                result.lieu = line.trim();
            }
        }
    }
    
    // Si pas de vendeur détecté, demander à l'utilisateur
    if (!result.vendeur) {
        result.vendeur = prompt('Vendeur pour cette commande :') || '';
    }
    
    return result;
}
// admin-script.js - Version ultime (Partie 4)

// ============================================
// BILAN
// ============================================
async function generateBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    const container = document.getElementById('bilanContainer');
    
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let query = db.collection('commandes')
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow);
        
        if (vendeur !== 'all') {
            query = query.where('vendeur', '==', vendeur);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande pour ce vendeur aujourd\'hui.</p>';
            return;
        }
        
        let totalVentes = 0;
        let totalFrais = 0;
        let commandesLivrees = 0;
        let details = [];
        
        const stats = {
            'À appeler': 0,
            'En-cours': 0,
            'Livrée': 0,
            'Indisponible': 0,
            'Va rappeler': 0,
            'Annulée': 0,
            'Refusée': 0,
            'Reportée': 0
        };
        let vendeurNom = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur || 'Inconnu';
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
            stats[data.statut] = (stats[data.statut] || 0) + 1;
            if (data.statut === 'Livrée') commandesLivrees++;
            details.push(`${data.numero} (${data.quartier || '?'}) : ${data.prixTotal} FCFA - ${data.statut}`);
        });
        
        const aEnvoyer = totalVentes - totalFrais;
        
        let statsHtml = '';
        for (const [key, value] of Object.entries(stats)) {
            statsHtml += `<div><strong>${key} :</strong> ${value}</div>`;
        }
        
        container.innerHTML = `
            <div class="bilan-result">
                <h4>📊 Bilan - ${vendeurNom}</h4>
                <div class="bilan-stats">
                    ${statsHtml}
                </div>
                <div class="bilan-stats" style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px;">
                    <div><strong>💰 Total ventes :</strong> ${totalVentes} FCFA</div>
                    <div><strong>🚚 Frais livraison :</strong> ${totalFrais} FCFA</div>
                    <div><strong>📤 À envoyer :</strong> ${aEnvoyer} FCFA</div>
                    <div><strong>✅ Commandes livrées :</strong> ${commandesLivrees}/${snapshot.size}</div>
                </div>
                <div class="bilan-details">
                    <strong>📦 Détail :</strong><br>
                    ${details.join('<br>')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur bilan:', error);
        showToast('❌ Erreur lors du bilan.', 'error');
    }
}

// ============================================
// COPIER BILAN
// ============================================
async function copyBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let query = db.collection('commandes')
            .where('dateCreation', '>=', today)
            .where('dateCreation', '<', tomorrow);
        
        if (vendeur !== 'all') {
            query = query.where('vendeur', '==', vendeur);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucune commande pour ce vendeur.', 'error');
            return;
        }
        
        let totalVentes = 0;
        let totalFrais = 0;
        const stats = {
            'À appeler': 0,
            'En-cours': 0,
            'Livrée': 0,
            'Indisponible': 0,
            'Va rappeler': 0,
            'Annulée': 0,
            'Refusée': 0,
            'Reportée': 0
        };
        let details = [];
        let vendeurNom = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur || 'Inconnu';
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
            stats[data.statut] = (stats[data.statut] || 0) + 1;
            details.push(`${data.numero} (${data.quartier || '?'}) : ${data.prixTotal} FCFA - ${data.statut}`);
        });
        
        const aEnvoyer = totalVentes - totalFrais;
        const dateStr = today.toLocaleDateString('fr-FR');
        
        let text = `📊 BILAN DU ${dateStr} - ${vendeurNom}\n\n`;
        text += `🔴 À appeler    : ${stats['À appeler']}\n`;
        text += `🔴 En-cours     : ${stats['En-cours']}\n`;
        text += `🔴 Livrée       : ${stats['Livrée']}\n`;
        text += `🔴 Indisponible : ${stats['Indisponible']}\n`;
        text += `🔴 Va rappeler  : ${stats['Va rappeler']}\n`;
        text += `🔴 Annulée      : ${stats['Annulée']}\n`;
        text += `🔴 Refusée      : ${stats['Refusée']}\n`;
        text += `🔴 Reportée     : ${stats['Reportée']}\n\n`;
        text += `💰 Montant total   : ${totalVentes} FCFA\n`;
        text += `🚚 Livraison total : ${totalFrais} FCFA\n`;
        text += `📤 À envoyer       : ${aEnvoyer} FCFA\n\n`;
        text += `📦 Détail :\n`;
        text += details.join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            playSound('success');
            showToast('✅ Bilan copié dans le presse-papiers !', 'success');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            playSound('success');
            showToast('✅ Bilan copié dans le presse-papiers !', 'success');
        });
    } catch (error) {
        console.error('Erreur copie:', error);
        playSound('error');
        showToast('❌ Erreur lors de la copie.', 'error');
    }
}

// ============================================
// PDF
// ============================================
async function generatePDF() {
    playSound('click');
    try {
        const vendeur = document.getElementById('bilanVendeurSelect').value;
        const today = new Date();
        const dateStr = today.toLocaleDateString('fr-FR');
        
        // Récupérer les données
        const snapshot = await db.collection('commandes')
            .where('dateCreation', '>=', new Date(new Date().setHours(0,0,0,0)))
            .get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucune commande pour générer un PDF.', 'error');
            return;
        }
        
        let html = `
            <div style="font-family:Arial;padding:20px;max-width:800px;margin:0 auto;">
                <h1 style="color:#1a2b4c;">HDIX - Bilan du ${dateStr}</h1>
                <hr style="border:1px solid #e2e8f0;"/>
                <h2>Résumé</h2>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr style="background:#f5f7fa;">
                        <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Commande</th>
                        <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Vendeur</th>
                        <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Montant</th>
                        <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Statut</th>
                    </tr>
        `;
        
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total += data.prixTotal || 0;
            html += `
                <tr>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${data.numero}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${data.vendeur}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${data.prixTotal} FCFA</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${data.statut}</td>
                </tr>
            `;
        });
        
        html += `
                    <tr style="font-weight:bold;background:#f5f7fa;">
                        <td colspan="2" style="padding:8px;border:1px solid #e2e8f0;">TOTAL</td>
                        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${total} FCFA</td>
                        <td style="padding:8px;border:1px solid #e2e8f0;"></td>
                    </tr>
                </table>
                <p style="color:#6b7a8f;font-size:12px;">Généré le ${new Date().toLocaleString()}</p>
            </div>
        `;
        
        // Ouvrir dans une nouvelle fenêtre pour impression/sauvegarde PDF
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
        win.print();
        
        playSound('success');
        showToast('📄 PDF généré avec succès !', 'success');
    } catch (error) {
        console.error('Erreur PDF:', error);
        showToast('❌ Erreur lors de la génération du PDF.', 'error');
    }
}

// ============================================
// ENVOYER BILAN PAR WHATSAPP
// ============================================
async function envoyerBilanWhatsApp() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    
    try {
        const today = new Date();
        const dateStr = today.toLocaleDateString('fr-FR');
        
        let query = db.collection('commandes')
            .where('dateCreation', '>=', new Date(new Date().setHours(0,0,0,0)));
        
        if (vendeur !== 'all') {
            query = query.where('vendeur', '==', vendeur);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucune commande.', 'error');
            return;
        }
        
        let totalVentes = 0;
        let details = [];
        let vendeurNom = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur || 'Inconnu';
            totalVentes += data.prixTotal || 0;
            details.push(`${data.numero} : ${data.prixTotal} FCFA - ${data.statut}`);
        });
        
        const message = `📊 BILAN DU ${dateStr} - ${vendeurNom}\n\n💰 Total ventes : ${totalVentes} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        
        const phone = prompt('Numéro WhatsApp du vendeur :');
        if (phone) {
            window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
            playSound('success');
            showToast('✅ Message WhatsApp envoyé !', 'success');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors de l\'envoi.', 'error');
    }
}

// ============================================
// RAPPORT MENSUEL
// ============================================
async function generateMonthlyReport() {
    playSound('click');
    const container = document.getElementById('monthlyReportContainer');
    
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const snapshot = await db.collection('commandes')
            .where('dateCreation', '>=', firstDay)
            .where('dateCreation', '<=', lastDay)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune commande pour ce mois.</p>';
            return;
        }
        
        let totalVentes = 0;
        let totalFrais = 0;
        let livrees = 0;
        const vendeursStats = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalVentes += data.prixTotal || 0;
            totalFrais += data.fraisLivraison || 0;
            if (data.statut === 'Livrée') livrees++;
            
            if (!vendeursStats[data.vendeur]) {
                vendeursStats[data.vendeur] = { commandes: 0, total: 0 };
            }
            vendeursStats[data.vendeur].commandes++;
            vendeursStats[data.vendeur].total += data.prixTotal || 0;
        });
        
        let vendeursHtml = '';
        for (const [nom, stats] of Object.entries(vendeursStats)) {
            vendeursHtml += `<div><strong>${nom}</strong> : ${stats.commandes} commandes - ${stats.total} FCFA</div>`;
        }
        
        const mois = today.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        
        container.innerHTML = `
            <div class="bilan-result">
                <h4>📈 Rapport mensuel - ${mois}</h4>
                <div class="bilan-stats">
                    <div><strong>Total commandes :</strong> ${snapshot.size}</div>
                    <div><strong>Total ventes :</strong> ${totalVentes} FCFA</div>
                    <div><strong>Frais livraison :</strong> ${totalFrais} FCFA</div>
                    <div><strong>Commandes livrées :</strong> ${livrees}</div>
                </div>
                <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;">
                    <strong>📊 Par vendeur :</strong><br>
                    ${vendeursHtml}
                </div>
            </div>
        `;
        playSound('success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du rapport mensuel.', 'error');
    }
}// admin-script.js - Version ultime (Partie 5)

// ============================================
// FRAIS DE STOCKAGE
// ============================================
async function loadStockage() {
    try {
        const snapshot = await db.collection('vendeurs').get();
        const container = document.getElementById('stockageList');
        const resume = document.getElementById('stockageResume');
        const dettes = document.getElementById('stockageDettes');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucun vendeur enregistré.</p>';
            return;
        }
        
        let html = '<div class="list-container">';
        let totalCasiers = 0;
        let totalDettes = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const dette = await getDetteStockage(doc.id);
            totalCasiers += dette.casiers || 0;
            totalDettes += dette.montant || 0;
            
            html += `
                <div class="list-item">
                    <div>
                        <strong>${data.nom}</strong>
                        <br><small>Casiers : ${dette.casiers || 0} | Dette : ${dette.montant || 0} FCFA</small>
                    </div>
                    <div>
                        <button onclick="ajouterCasier('${doc.id}')" class="btn-edit">+ Casier</button>
                        <button onclick="retirerCasier('${doc.id}')" class="btn-delete">- Casier</button>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        
        resume.innerHTML = `
            <div style="font-size:18px;font-weight:700;color:#1a2b4c;">${totalCasiers}</div>
            <div style="color:#6b7a8f;font-size:13px;">casiers occupés</div>
        `;
        dettes.innerHTML = `
            <div style="font-size:18px;font-weight:700;color:${totalDettes > 0 ? '#c0392b' : '#2d7d46'};">${totalDettes} FCFA</div>
            <div style="color:#6b7a8f;font-size:13px;">dette totale du mois</div>
        `;
    } catch (error) {
        console.error('Erreur chargement stockage:', error);
    }
}

async function getDetteStockage(vendeurId) {
    try {
        const snapshot = await db.collection('stockage')
            .where('vendeurId', '==', vendeurId)
            .where('mois', '==', new Date().getMonth() + 1)
            .where('annee', '==', new Date().getFullYear())
            .get();
        
        if (snapshot.empty) {
            return { casiers: 0, montant: 0 };
        }
        
        const data = snapshot.docs[0].data();
        return { casiers: data.casiers || 0, montant: data.dette || 0 };
    } catch (error) {
        console.error('Erreur:', error);
        return { casiers: 0, montant: 0 };
    }
}

async function ajouterCasier(vendeurId) {
    playSound('click');
    try {
        const snapshot = await db.collection('stockage')
            .where('vendeurId', '==', vendeurId)
            .where('mois', '==', new Date().getMonth() + 1)
            .where('annee', '==', new Date().getFullYear())
            .get();
        
        const casiers = parseInt(prompt('Nombre de casiers à ajouter :') || '1');
        if (isNaN(casiers) || casiers <= 0) return;
        
        let docId;
        let currentData;
        
        if (snapshot.empty) {
            const newDoc = await db.collection('stockage').add({
                vendeurId: vendeurId,
                casiers: casiers,
                dette: casiers * 5000,
                mois: new Date().getMonth() + 1,
                annee: new Date().getFullYear()
            });
            docId = newDoc.id;
        } else {
            const doc = snapshot.docs[0];
            currentData = doc.data();
            const newCasiers = (currentData.casiers || 0) + casiers;
            await db.collection('stockage').doc(doc.id).update({
                casiers: newCasiers,
                dette: newCasiers * 5000
            });
        }
        
        playSound('success');
        showToast(`✅ ${casiers} casier(s) ajouté(s) !`, 'success');
        loadStockage();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors de l\'ajout.', 'error');
    }
}

async function retirerCasier(vendeurId) {
    playSound('click');
    try {
        const snapshot = await db.collection('stockage')
            .where('vendeurId', '==', vendeurId)
            .where('mois', '==', new Date().getMonth() + 1)
            .where('annee', '==', new Date().getFullYear())
            .get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucun casier pour ce vendeur.', 'error');
            return;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        const casiersActuels = data.casiers || 0;
        
        if (casiersActuels <= 0) {
            showToast('⚠️ Aucun casier à retirer.', 'error');
            return;
        }
        
        const aRetirer = parseInt(prompt(`Casiers actuels : ${casiersActuels}. Combien retirer ?`) || '1');
        if (isNaN(aRetirer) || aRetirer <= 0) return;
        
        const newCasiers = Math.max(0, casiersActuels - aRetirer);
        await db.collection('stockage').doc(doc.id).update({
            casiers: newCasiers,
            dette: newCasiers * 5000
        });
        
        playSound('success');
        showToast(`✅ ${aRetirer} casier(s) retiré(s) !`, 'success');
        loadStockage();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du retrait.', 'error');
    }
}

async function activerPrelevements() {
    playSound('click');
    if (!confirm('Activer les prélèvements pour tous les vendeurs (J-2) ?')) return;
    
    try {
        const snapshot = await db.collection('stockage')
            .where('mois', '==', new Date().getMonth() + 1)
            .where('annee', '==', new Date().getFullYear())
            .get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucun vendeur avec frais de stockage.', 'error');
            return;
        }
        
        let count = 0;
        for (const doc of snapshot.docs) {
            await db.collection('stockage').doc(doc.id).update({
                prelevementsActifs: true,
                dateActivation: new Date()
            });
            count++;
        }
        
        playSound('success');
        showToast(`✅ Prélèvements activés pour ${count} vendeur(s) !`, 'success');
        loadStockage();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors de l\'activation.', 'error');
    }
}

async function appliquerPenalites() {
    playSound('click');
    if (!confirm('⚠️ Appliquer les pénalités de 2.500 FCFA/jour aux vendeurs en retard ?')) return;
    
    try {
        const snapshot = await db.collection('stockage')
            .where('mois', '==', new Date().getMonth() + 1)
            .where('annee', '==', new Date().getFullYear())
            .get();
        
        if (snapshot.empty) {
            showToast('⚠️ Aucun vendeur avec dette.', 'error');
            return;
        }
        
        let count = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.dette > 0) {
                const penalite = 2500;
                const nouvelleDette = data.dette + penalite;
                await db.collection('stockage').doc(doc.id).update({
                    dette: nouvelleDette,
                    penalites: (data.penalites || 0) + penalite,
                    dernierJourRetard: new Date()
                });
                count++;
            }
        }
        
        playSound('success');
        showToast(`✅ Pénalités appliquées à ${count} vendeur(s) !`, 'success');
        loadStockage();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors de l\'application.', 'error');
    }
}

// ============================================
// INSCRIPTIONS (MODÉRATION)
// ============================================
async function loadInscriptions() {
    try {
        const snapshot = await db.collection('inscriptions')
            .where('statut', '==', 'en_attente')
            .orderBy('dateDemande', 'asc')
            .get();
        
        const container = document.getElementById('inscriptionsList');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune demande en attente.</p>';
            return;
        }
        
        let html = '<div class="list-container">';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="list-item">
                    <div>
                        <strong>${data.nom} ${data.prenom || ''}</strong>
                        <br><small>📞 ${data.telephone} | Rôle : ${data.role}</small>
                        ${data.boutique ? `<br><small>🏪 ${data.boutique}</small>` : ''}
                    </div>
                    <div>
                        <button onclick="accepterInscription('${doc.id}')" class="btn-success" style="padding:6px 12px;border:none;border-radius:6px;color:white;cursor:pointer;">✅ Accepter</button>
                        <button onclick="refuserInscription('${doc.id}')" class="btn-danger" style="padding:6px 12px;border:none;border-radius:6px;color:white;cursor:pointer;">❌ Refuser</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement inscriptions:', error);
    }
}

async function accepterInscription(id) {
    playSound('click');
    if (!confirm('Accepter cette demande d\'inscription ?')) return;
    
    try {
        const doc = await db.collection('inscriptions').doc(id).get();
        const data = doc.data();
        
        const codeSecret = generateCodeSecret();
        
        await db.collection('inscriptions').doc(id).update({
            statut: 'acceptée',
            dateTraitement: new Date(),
            codeSecret: codeSecret
        });
        
        // Créer l'utilisateur dans Firestore
        await db.collection('users').add({
            nom: data.nom,
            prenom: data.prenom || '',
            telephone: data.telephone,
            role: data.role,
            code_secret: codeSecret,
            boutique: data.boutique || '',
            dateCreation: new Date()
        });
        
        playSound('success');
        showToast(`✅ Inscription acceptée ! Code : ${codeSecret}`, 'success');
        loadInscriptions();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors de l\'acceptation.', 'error');
    }
}

async function refuserInscription(id) {
    playSound('click');
    const motif = prompt('Motif du refus :');
    
    try {
        await db.collection('inscriptions').doc(id).update({
            statut: 'refusée',
            dateTraitement: new Date(),
            motifRefus: motif || 'Non spécifié'
        });
        
        playSound('success');
        showToast('❌ Inscription refusée.', 'info');
        loadInscriptions();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du refus.', 'error');
    }
}

function generateCodeSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// VENDEURS POUR BILAN
// ============================================
async function loadVendeursForBilan() {
    try {
        const snapshot = await db.collection('commandes').get();
        const vendeurs = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.vendeur) vendeurs.add(data.vendeur);
        });
        
        const select = document.getElementById('bilanVendeurSelect');
        select.innerHTML = '<option value="all">Tous les vendeurs</option>';
        vendeurs.forEach(v => {
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement vendeurs bilan:', error);
    }
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        document.getElementById('adminName').textContent = userData.nom || 'Admin';
    } catch {
        window.location.href = 'index.html';
        return;
    }
    
    loadCommandes();
    loadAppels();
    loadVendeursForBilan();
})
// ============================================
// KPI (Tableau de bord)
// ============================================
async function loadKPI() {
    showSpinner();
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Commandes du jour
        const snapshotJour = await db.collection('commandes')
            .where('dateCreation', '>=', today)
            .get();
        
        // Commandes du mois
        const snapshotMois = await db.collection('commandes')
            .where('dateCreation', '>=', firstDay)
            .get();
        
        // Vendeurs
        const vendeurs = await db.collection('vendeurs').get();
        
        // Livreurs
        const livreurs = await db.collection('livreurs').get();
        
        let total = 0, appeler = 0, livree = 0, ca = 0;
        snapshotJour.forEach(doc => {
            const data = doc.data();
            total++;
            if (data.statut === 'À appeler') appeler++;
            if (data.statut === 'Livrée') livree++;
            ca += data.prixTotal || 0;
        });
        
        document.getElementById('kpiTotal').textContent = total;
        document.getElementById('kpiAppeler').textContent = appeler;
        document.getElementById('kpiLivree').textContent = livree;
        document.getElementById('kpiCA').textContent = ca.toLocaleString();
        document.getElementById('kpiVendeurs').textContent = vendeurs.size;
        document.getElementById('kpiLivreurs').textContent = livreurs.size;
        
        // Taux de livraison
        const txLivraison = total > 0 ? Math.round((livree / total) * 100) : 0;
        document.getElementById('kpiTauxLivraison').textContent = txLivraison + '%';
        
        // Panier moyen
        const moy = livree > 0 ? Math.round(ca / livree) : 0;
        document.getElementById('kpiMoyenne').textContent = moy.toLocaleString();
        
        // Tendances (simulées)
        document.getElementById('kpiTotalTrend').textContent = '▲ ' + (total > 0 ? Math.round(Math.random() * 20) : 0) + '%';
        document.getElementById('kpiAppelerTrend').textContent = '▲ ' + (appeler > 0 ? Math.round(Math.random() * 15) : 0) + '%';
        document.getElementById('kpiLivreeTrend').textContent = '▲ ' + (livree > 0 ? Math.round(Math.random() * 25) : 0) + '%';
        document.getElementById('kpiCATrend').textContent = '▲ ' + (ca > 0 ? Math.round(Math.random() * 30) : 0) + '%';
        
    } catch (error) {
        console.error('Erreur KPI:', error);
    }
    hideSpinner();
}

// ============================================
// FILTRES
// ============================================
let filtreActif = 'all';

function filtrerCommandes(statut) {
    filtreActif = statut;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === statut);
    });
    loadCommandes();
}

// ============================================
// OPTIMISATION DES TOURNÉES
// ============================================
async function optimiserTournees() {
    showSpinner();
    try {
        const snapshot = await db.collection('commandes')
            .where('statut', 'in', ['En-cours', 'À appeler'])
            .get();
        
        if (snapshot.empty) {
            document.getElementById('tourneesContainer').innerHTML = `
                <p class="empty-message">Aucune commande en cours à optimiser.</p>
            `;
            hideSpinner();
            return;
        }
        
        // Simuler l'optimisation (tri par zone)
        const commandes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            commandes.push({ id: doc.id, ...data });
        });
        
        // Trier par zone
        const zones = ['Libreville', 'Akanda', 'Owendo', 'Bikélé'];
        commandes.sort((a, b) => {
            const idxA = zones.indexOf(a.zone);
            const idxB = zones.indexOf(b.zone);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
        
        let html = `
            <div class="bilan-result">
                <h4>🗺️ Itinéraire optimisé</h4>
                <p style="color:#6b7a8f;font-size:13px;">${commandes.length} commandes optimisées</p>
                <div style="margin-top:12px;">
        `;
        commandes.forEach((cmd, index) => {
            html += `
                <div class="recap-item">
                    <span>${index + 1}. ${cmd.numero}</span>
                    <span>${cmd.zone || 'Non définie'}</span>
                    <span style="color:#6b7a8f;font-size:12px;">${cmd.quartier}</span>
                </div>
            `;
        });
        html += '</div></div>';
        document.getElementById('tourneesContainer').innerHTML = html;
        
        showToast('✅ Tournées optimisées avec succès !', 'success');
    } catch (error) {
        console.error('Erreur optimisation:', error);
        showToast('❌ Erreur lors de l\'optimisation.', 'error');
    }
    hideSpinner();
}

// ============================================
// ATTRIBUTION AUTOMATIQUE
// ============================================
async function attributionAuto() {
    showSpinner();
    try {
        const livreursSnapshot = await db.collection('livreurs')
            .where('actif', '==', true)
            .get();
        
        if (livreursSnapshot.empty) {
            showToast('⚠️ Aucun livreur actif.', 'error');
            hideSpinner();
            return;
        }
        
        const livreurs = [];
        livreursSnapshot.forEach(doc => {
            livreurs.push({ id: doc.id, ...doc.data(), charge: 0 });
        });
        
        const commandesSnapshot = await db.collection('commandes')
            .where('statut', '==', 'À appeler')
            .get();
        
        if (commandesSnapshot.empty) {
            showToast('⚠️ Aucune commande à attribuer.', 'error');
            hideSpinner();
            return;
        }
        
        let attribuees = 0;
        for (const doc of commandesSnapshot.docs) {
            const data = doc.data();
            // Trouver le livreur le moins chargé
            livreurs.sort((a, b) => a.charge - b.charge);
            const livreur = livreurs[0];
            
            if (livreur && (livreur.charge < (livreur.capacite || 15))) {
                await db.collection('commandes').doc(doc.id).update({
                    livreurId: livreur.id,
                    livreurNom: livreur.nom,
                    statut: 'En-cours',
                    dateAssignation: new Date()
                });
                livreur.charge++;
                attribuees++;
            }
        }
        
        showToast(`✅ ${attribuees} commandes attribuées automatiquement !`, 'success');
        loadCommandes();
        loadAppels();
        optimiserTournees();
    } catch (error) {
        console.error('Erreur attribution auto:', error);
        showToast('❌ Erreur lors de l\'attribution.', 'error');
    }
    hideSpinner();
}

// ============================================
// SPINNER
// ============================================
function showSpinner() {
    document.getElementById('globalSpinner').classList.add('active');
}

function hideSpinner() {
    document.getElementById('globalSpinner').classList.remove('active');
}

