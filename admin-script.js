// admin-script.js - Version complète avec gestion des livreurs et calcul des gains à la livraison

// ========== SONS ==========
let clickSound = null, successSound = null, errorSound = null;
function loadSounds() {
    try {
        clickSound = new Audio('assets/sounds/click.mp3');
        successSound = new Audio('assets/sounds/success.mp3');
        errorSound = new Audio('assets/sounds/error.mp3');
        clickSound.load(); successSound.load(); errorSound.load();
        clickSound.volume = 0.6; successSound.volume = 0.5; errorSound.volume = 0.5;
    } catch(e) { console.log('Sons non disponibles'); }
}
function playSound(type) {
    try {
        if (type === 'click' && clickSound) { clickSound.currentTime = 0; clickSound.play().catch(e=>{}); }
        else if (type === 'success' && successSound) { successSound.currentTime = 0; successSound.play().catch(e=>{}); }
        else if (type === 'error' && errorSound) { errorSound.currentTime = 0; errorSound.play().catch(e=>{}); }
    } catch(e) {}
}
loadSounds();

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 400); }, 3000);
}

function formatNumber(num) { if (num === undefined || num === null) return '0'; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function showSpinner() { document.getElementById('globalSpinner').classList.add('active'); }
function hideSpinner() { document.getElementById('globalSpinner').classList.remove('active'); }

function logout() { playSound('click'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; }

// ========== NAVIGATION ==========
function showSection(section) {
    playSound('click');
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`section-${section}`).classList.add('active');
    document.querySelector(`.nav-btn[onclick="showSection('${section}')"]`).classList.add('active');
    
    if (section === 'commandes') { loadCommandes(); }
    if (section === 'stocks') { loadStockage(); }
    if (section === 'administration') { loadVendeurs(); loadAgents(); loadLivreurs(); loadInscriptions(); }
    if (section === 'bilan') { loadKPI(); loadVendeursForBilan(); loadTresorerie(); }
}

// ========== KPI ==========
async function loadKPI() {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const snapshot = await db.collection('commandes').where('dateCreation', '>=', today).get();
        const vendeurs = await db.collection('vendeurs').get();
        const livreurs = await db.collection('livreurs').get();
        let total = 0, appeler = 0, livree = 0, ca = 0;
        snapshot.forEach(doc => { const data = doc.data(); total++; if (data.statut === 'À appeler') appeler++; if (data.statut === 'Livrée') livree++; ca += data.prixTotal || 0; });
        document.getElementById('kpiTotal').textContent = total;
        document.getElementById('kpiAppeler').textContent = appeler;
        document.getElementById('kpiLivree').textContent = livree;
        document.getElementById('kpiCA').textContent = formatNumber(ca);
        document.getElementById('kpiVendeurs').textContent = vendeurs.size;
        document.getElementById('kpiLivreurs').textContent = livreurs.size;
        const tx = total > 0 ? Math.round((livree/total)*100) : 0;
        document.getElementById('kpiTauxLivraison').textContent = tx + '%';
        const moy = livree > 0 ? Math.round(ca/livree) : 0;
        document.getElementById('kpiMoyenne').textContent = formatNumber(moy);
    } catch(e) { console.error(e); }
}

// ========== COMMANDES ==========
let filtreActif = 'all';
let selectionMode = false;
let commandesSelectionnees = [];

async function loadCommandes() {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow).orderBy('dateCreation','desc');
        if (filtreActif && filtreActif !== 'all') query = query.where('statut','==',filtreActif);
        const snapshot = await query.get();
        const container = document.getElementById('commandesContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande.</p>'; updateStats(0,0,0); return; }
        
        let html = '', appeler = 0, livree = 0, total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total++; if (data.statut === 'À appeler') appeler++; if (data.statut === 'Livrée') livree++;
            const sc = data.statut === 'Livrée' ? 'statut-livree' : data.statut === 'À appeler' ? 'statut-appel' : 'statut-attente';
            
            const checkbox = selectionMode ? `<input type="checkbox" class="commande-check" value="${doc.id}" onchange="updateSelection()" />` : '';
            
            // Déterminer le type de livreur pour affichage
            let typeLabel = '';
            if (data.livreurType === 'interne') typeLabel = '🔒';
            else if (data.livreurContrat === 'garde_tout') typeLabel = '💰';
            else if (data.livreurContrat === 'partage') typeLabel = '📊';
            
            html += `<div class="commande-item" onclick="afficherCommande('${doc.id}')">
                ${checkbox}
                <span class="numero">${data.numero||'N/A'}</span>
                <span class="localisation">📍 ${data.quartier||''}, ${data.ville||''}</span>
                <span class="vendeur">${data.vendeur||'N/A'}</span>
                <span class="montant">${formatNumber(data.prixTotal||0)} FCFA</span>
                <span class="statut ${sc}">${data.statut||'N/A'}</span>
                <span class="actions">
                    <button onclick="event.stopPropagation(); modifierCommande('${doc.id}')" title="Modifier">✏️</button>
                    <button onclick="event.stopPropagation(); supprimerCommande('${doc.id}')" title="Supprimer">🗑️</button>
                    <button onclick="event.stopPropagation(); afficherCommande('${doc.id}')" title="Voir">👁️</button>
                    ${data.statut !== 'Livrée' && data.statut !== 'En-cours' ? `<button onclick="event.stopPropagation(); assignerCommande('${doc.id}')" title="Assigner">🚚</button>` : ''}
                    ${data.statut === 'En-cours' && data.livreurId ? `<button onclick="event.stopPropagation(); marquerLivree('${doc.id}')" title="Marquer livrée" style="background:#27ae60;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;">✅</button>` : ''}
                    ${data.statut === 'Livrée' ? `<span style="font-size:11px;color:#6b7a8f;">${typeLabel}</span>` : ''}
                </span>
            </div>`;
        });
        container.innerHTML = html;
        updateStats(appeler, livree, total);
        commandesSelectionnees = [];
    } catch(e) { console.error(e); }
}

function updateStats(appeler, livree, total) {
    document.getElementById('statAppeler').textContent = appeler;
    document.getElementById('statLivree').textContent = livree;
    document.getElementById('statTotal').textContent = total;
}

function filtrerCommandes(statut) {
    playSound('click');
    filtreActif = statut;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    loadCommandes();
}

function toggleSelectionMode() {
    selectionMode = !selectionMode;
    const btn = document.querySelector('.btn-secondary[onclick="toggleSelectionMode()"]');
    if (btn) btn.textContent = selectionMode ? '☑️ Désélectionner' : '☑️ Sélectionner';
    loadCommandes();
}

function updateSelection() {
    const checkboxes = document.querySelectorAll('.commande-check:checked');
    commandesSelectionnees = Array.from(checkboxes).map(cb => cb.value);
}

async function assignerSelection() {
    if (commandesSelectionnees.length === 0) {
        showToast('⚠️ Sélectionnez au moins une commande.', 'error');
        return;
    }
    
    const livreursSnapshot = await db.collection('livreurs').where('actif', '==', true).get();
    if (livreursSnapshot.empty) { showToast('⚠️ Aucun livreur disponible.', 'error'); return; }
    
    let livreursList = [];
    livreursSnapshot.forEach(doc => {
        livreursList.push({ id: doc.id, ...doc.data() });
    });
    
    let options = livreursList.map((l, index) => {
        let typeLabel = '';
        if (l.type === 'interne') typeLabel = '🔒 Interne';
        else if (l.contrat === 'garde_tout') typeLabel = '💰 Garde tout';
        else typeLabel = '📊 Partage';
        return `${index + 1}. ${l.nom} (${l.zone || 'Sans zone'}) - ${typeLabel}`;
    }).join('\n');
    
    const choix = prompt(
        `📋 ${commandesSelectionnees.length} commandes sélectionnées.\n\nSélectionnez un livreur :\n\n${options}\n\nEntrez le numéro :`
    );
    
    if (!choix) return;
    
    const idx = parseInt(choix) - 1;
    if (isNaN(idx) || idx < 0 || idx >= livreursList.length) {
        showToast('⚠️ Sélection invalide.', 'error');
        return;
    }
    
    const livreur = livreursList[idx];
    
    try {
        for (const commandeId of commandesSelectionnees) {
            await db.collection('commandes').doc(commandeId).update({
                livreurId: livreur.id,
                livreurNom: livreur.nom,
                livreurType: livreur.type || 'externe',
                livreurContrat: livreur.contrat || 'partage',
                statut: 'En-cours',
                dateAssignation: new Date()
            });
        }
        
        playSound('success');
        showToast(`✅ ${commandesSelectionnees.length} commandes assignées à ${livreur.nom} !`, 'success');
        commandesSelectionnees = [];
        loadCommandes();
        loadKPI();
    } catch(e) {
        console.error('Erreur assignation multiple:', e);
        showToast('❌ Erreur lors de l\'assignation.', 'error');
    }
}

// ========== CALCUL DES GAINS À LA LIVRAISON ==========
function calculerGainsLivraison(livreur, fraisLivraison) {
    // Taux par zone pour les livreurs externes en partage
    const tauxPartAgent = {
        'Libreville': 500,
        'Nzeng-Ayong': 500,
        'Akanda': 1000,
        'Owendo': 1000,
        'zones_difficiles': 1000,
        'autres': 1000
    };
    
    let partAgent = 0;
    let partLivreur = 0;
    let mode = '';
    
    if (livreur.type === 'interne' && livreur.contrat === 'salarie') {
        // INTERNE : L'entreprise garde tout
        partAgent = fraisLivraison;
        partLivreur = 0;
        mode = 'interne';
    } else if (livreur.type === 'externe' && livreur.contrat === 'garde_tout') {
        // EXTERNE GARDE TOUT : Tout pour le livreur
        partAgent = 0;
        partLivreur = fraisLivraison;
        mode = 'garde_tout';
    } else {
        // EXTERNE PARTAGE : Taux fixe pour l'agent, reste pour le livreur
        const zone = livreur.zone || 'Libreville';
        partAgent = tauxPartAgent[zone] || 500;
        partLivreur = Math.max(0, fraisLivraison - partAgent);
        mode = 'partage';
    }
    
    return {
        total: fraisLivraison,
        partAgent: partAgent,
        partLivreur: partLivreur,
        mode: mode,
        fraisLivraison: fraisLivraison
    };
}

// ========== MARQUER UNE COMMANDE COMME LIVRÉE ==========
async function marquerLivree(commandeId) {
    playSound('click');
    if (!confirm('✅ Marquer cette commande comme livrée ?\n\nLes gains seront calculés automatiquement.')) return;
    
    showSpinner();
    try {
        // 1. Récupérer la commande
        const cmdDoc = await db.collection('commandes').doc(commandeId).get();
        if (!cmdDoc.exists) { showToast('❌ Commande introuvable.', 'error'); hideSpinner(); return; }
        const cmd = cmdDoc.data();
        
        // 2. Vérifier que la commande a un livreur
        if (!cmd.livreurId) { 
            showToast('⚠️ Cette commande n\'a pas de livreur assigné.', 'error'); 
            hideSpinner(); 
            return; 
        }
        
        // 3. Récupérer le livreur
        const livreurDoc = await db.collection('livreurs').doc(cmd.livreurId).get();
        if (!livreurDoc.exists) { showToast('❌ Livreur introuvable.', 'error'); hideSpinner(); return; }
        const livreur = livreurDoc.data();
        
        // 4. Calculer les gains
        const fraisLivraison = cmd.fraisLivraison || 0;
        const gains = calculerGainsLivraison(livreur, fraisLivraison);
        
        // 5. Mettre à jour la commande
        await db.collection('commandes').doc(commandeId).update({
            statut: 'Livrée',
            dateLivraison: new Date(),
            gains: gains,
            partAgent: gains.partAgent,
            partLivreur: gains.partLivreur
        });
        
        // 6. Mettre à jour les gains du livreur
        await db.collection('livreurs').doc(cmd.livreurId).update({
            'gains.total_collecte': (livreur.gains?.total_collecte || 0) + gains.total,
            'gains.part_livreur': (livreur.gains?.part_livreur || 0) + gains.partLivreur,
            'gains.part_agent': (livreur.gains?.part_agent || 0) + gains.partAgent,
            'gains.derniere_livraison': new Date()
        });
        
        // 7. Enregistrer dans la trésorerie (pour le suivi)
        await db.collection('tresorerie').add({
            type: 'livraison',
            commandeId: commandeId,
            numero: cmd.numero || 'N/A',
            livreurId: cmd.livreurId,
            livreurNom: cmd.livreurNom || 'Inconnu',
            montant: gains.total,
            partAgent: gains.partAgent,
            partLivreur: gains.partLivreur,
            mode: gains.mode,
            date: new Date(),
            description: `Livraison ${cmd.numero} - ${cmd.livreurNom}`
        });
        
        playSound('success');
        
        // Message de confirmation avec détails
        let modeLabel = '';
        if (gains.mode === 'interne') modeLabel = '🔒 Interne';
        else if (gains.mode === 'garde_tout') modeLabel = '💰 Garde tout';
        else modeLabel = '📊 Partage';
        
        showToast(
            `✅ Commande ${cmd.numero || ''} livrée !\n` +
            `📊 ${modeLabel}\n` +
            `💰 Livreur: ${formatNumber(gains.partLivreur)} FCFA\n` +
            `🏢 Agent: ${formatNumber(gains.partAgent)} FCFA`,
            'success'
        );
        
        loadCommandes();
        loadLivreurs();
        loadTresorerie();
        loadKPI();
    } catch (error) {
        console.error('Erreur livraison:', error);
        showToast('❌ Erreur lors de la livraison.', 'error');
    }
    hideSpinner();
}

// ========== MODALE NOUVELLE COMMANDE ==========
async function openCommandeModal(commandeId) {
    playSound('click');
    resetCommandeForm();
    await loadVendeursForSelect('commandeVendeurSelect');
    document.getElementById('commandeModal').classList.add('active');
    if (commandeId) await loadCommandeForEdit(commandeId);
}

function closeCommandeModal() {
    playSound('click');
    document.getElementById('commandeModal').classList.remove('active');
    resetCommandeForm();
}

function resetCommandeForm() {
    document.getElementById('articlesContainer').innerHTML = '';
    addArticleRow();
    document.getElementById('commandeTelephone').value = '';
    document.getElementById('commandePrix').value = '';
    document.getElementById('commandeFraisInclus').checked = true;
    document.getElementById('commandeZone').value = '';
    document.getElementById('commandeQuartier').value = '';
    document.getElementById('commandeVille').value = '';
    document.getElementById('commandeNote').value = '';
    document.getElementById('collageInput').value = '';
    document.getElementById('collageResult').innerHTML = '';
    switchMode('saisie');
}

function switchMode(mode) {
    document.getElementById('toggleSaisie').classList.toggle('active', mode === 'saisie');
    document.getElementById('toggleCollage').classList.toggle('active', mode === 'collage');
    document.getElementById('modeSaisie').style.display = mode === 'saisie' ? 'block' : 'none';
    document.getElementById('modeCollage').style.display = mode === 'collage' ? 'block' : 'none';
}

async function loadVendeursForSelect(selectId) {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Sélectionnez --</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = data.nom;
            select.appendChild(opt);
        });
    } catch(e) { console.error(e); }
}

function addArticleRow() {
    playSound('click');
    const container = document.getElementById('articlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="number" class="article-qty" placeholder="Qté" min="1" value="1" /><input type="text" class="article-name" placeholder="Nom" />`;
    container.appendChild(row);
}

async function saveCommande() {
    const select = document.getElementById('commandeVendeurSelect');
    const vendeurId = select.value;
    if (!vendeurId) { showToast('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const vendeurNom = select.options[select.selectedIndex].textContent;
    const telephone = document.getElementById('commandeTelephone').value.trim();
    if (!telephone) { showToast('⚠️ Téléphone client requis.', 'error'); return; }
    const rows = document.querySelectorAll('#articlesContainer .article-row');
    const articles = [];
    rows.forEach(row => {
        const qty = row.querySelector('.article-qty').value;
        const name = row.querySelector('.article-name').value.trim();
        if (name) articles.push({ quantite: parseInt(qty)||1, nom: name });
    });
    if (articles.length === 0) { showToast('⚠️ Ajoutez un article.', 'error'); return; }
    const prix = parseInt(document.getElementById('commandePrix').value);
    if (isNaN(prix) || prix <= 0) { showToast('⚠️ Prix valide requis.', 'error'); return; }
    const quartier = document.getElementById('commandeQuartier').value.trim();
    const ville = document.getElementById('commandeVille').value.trim();
    if (!quartier || !ville) { showToast('⚠️ Quartier et ville requis.', 'error'); return; }
    const zone = document.getElementById('commandeZone').value;
    const fraisInclus = document.getElementById('commandeFraisInclus').checked;
    const note = document.getElementById('commandeNote').value.trim();
    const zones = { 'Libreville':2000, 'Akanda':3000, 'Owendo':3000, 'Bikélé':3000, 'Autres':4000 };
    const fraisLivraison = fraisInclus ? 0 : (zones[zone] || 0);

    // Récupérer l'abréviation du vendeur
    const vendeurDoc = await db.collection('vendeurs').doc(vendeurId).get();
    const vendeurData = vendeurDoc.data();
    const abreviation = vendeurData.abreviation || 'VEN';

    // Compter les commandes du vendeur pour le numéro
    const snapshot = await db.collection('commandes')
        .where('vendeurId', '==', vendeurId)
        .get();
    const count = snapshot.size + 1;
    const numero = `${abreviation}-${String(count).padStart(3, '0')}`;

    const data = { 
        numero: numero,
        articles, prixTotal: prix, fraisInclus, fraisLivraison, zone, quartier, ville, note, telephone, 
        vendeurId, vendeur: vendeurNom, statut: 'À appeler', dateCreation: new Date(), admin: 'Admin' 
    };
    
    try {
        await db.collection('commandes').add(data);
        playSound('success');
        showToast(`✅ Commande ${numero} enregistrée !`, 'success');
        closeCommandeModal();
        loadCommandes(); loadKPI();
    } catch(e) { console.error(e); showToast('❌ Erreur enregistrement.', 'error'); }
}

// ========== COLLAGE ==========
function collerTexte() {
    playSound('click');
    navigator.clipboard.readText().then(text => {
        document.getElementById('collageInput').value = text;
        showToast('✅ Texte collé !', 'success');
        setTimeout(analyserCollage, 400);
    }).catch(() => {
        showToast('⚠️ Collez manuellement (Ctrl+V).', 'error');
        document.getElementById('collageInput').focus();
    });
}

function analyserCollage() {
    const text = document.getElementById('collageInput').value.trim();
    if (!text) { showToast('⚠️ Collez un texte.', 'error'); return; }
    const result = analyserTexte(text);
    if (result.articles.length === 0) { showToast('⚠️ Aucun article détecté.', 'error'); return; }
    afficherConfirmationCollage(result);
}

function analyserTexte(text) {
    const result = { articles: [], vendeur: '', prix: null, frais: 0, lieu: '', telephone: '', note: '' };
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(line => {
        const trimmed = line.trim();
        const articleMatch = trimmed.match(/^(\d+)\s*[xX]?\s*(.+)$/);
        if (articleMatch) { result.articles.push({ quantite: parseInt(articleMatch[1]), nom: articleMatch[2].trim() }); return; }
        const prixMatch = trimmed.match(/(\d+[\s']?\d*)\s*F?CFA?/i);
        if (prixMatch && !result.prix) { result.prix = parseInt(prixMatch[1].replace(/\s/g, '')); return; }
        const fraisMatch = trimmed.match(/livraison\s*[:]?\s*(\d+[\s']?\d*)/i);
        if (fraisMatch) { result.frais = parseInt(fraisMatch[1].replace(/\s/g, '')); return; }
        if (trimmed.includes('ville')||trimmed.includes('quartier')||trimmed.includes('Libreville')||trimmed.includes('Akanda')||trimmed.includes('Owendo')) { result.lieu = trimmed; return; }
        if (trimmed.includes('vendeur')||trimmed.includes('Vendeur')) { result.vendeur = trimmed.replace(/vendeur\s*/i,'').trim(); return; }
        const phoneMatch = trimmed.match(/[\+]?[0-9]{8,15}/);
        if (phoneMatch && !result.telephone) { result.telephone = phoneMatch[0]; return; }
        if (trimmed.includes('note')||trimmed.includes('Note')) { result.note = trimmed.replace(/note\s*/i,'').trim(); return; }
    });
    if (!result.lieu) { for (const line of lines) { if (line.length > 3 && line.length < 50 && !result.lieu) { result.lieu = line.trim(); } } }
    return result;
}

// ========== MODALE DÉTAIL ==========
async function afficherCommande(id) {
    playSound('click');
    try {
        const doc = await db.collection('commandes').doc(id).get();
        const data = doc.data();
        if (!data) { showToast('⚠️ Commande non trouvée.', 'error'); return; }
        const modal = document.getElementById('detailCommandeModal');
        const content = document.getElementById('detailCommandeContent');
        let articlesHtml = '';
        if (data.articles && data.articles.length > 0) {
            data.articles.forEach((a, idx) => {
                articlesHtml += `
                    <div style="display:flex;gap:8px;margin-bottom:4px;">
                        <input type="number" value="${a.quantite}" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qty" />
                        <input type="text" value="${a.nom}" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-name" />
                    </div>
                `;
            });
        } else { articlesHtml = '<span style="color:#6b7a8f;">Aucun article</span>'; }
        const statuts = ['À appeler', 'Validé', 'En-cours', 'Livrée', 'Indisponible', 'Va rappeler', 'Annulée', 'Refusée', 'Reportée'];
        let statutOptions = '';
        statuts.forEach(s => { const selected = data.statut === s ? 'selected' : ''; statutOptions += `<option value="${s}" ${selected}>${s}</option>`; });
        content.innerHTML = `
            <div class="step-title">📋 ${data.numero || 'N/A'}</div>
            <div style="margin-top:8px;">
                <div class="recap-item"><span>Vendeur</span><span><input type="text" id="editVendeur" value="${data.vendeur||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📞 Téléphone</span><span><input type="tel" id="editTelephone" value="${data.telephone||''}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>Articles</span></div>
                <div id="editArticlesContainer" style="padding:4px 0 8px 16px;">${articlesHtml}</div>
                <button onclick="ajouterLigneArticleEdit()" class="add-article-btn" style="margin-top:4px;padding:6px;">+ Ajouter un article</button>
                <div class="recap-item"><span>💰 Montant</span><span><input type="number" id="editPrix" value="${data.prixTotal||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>🚚 Frais livraison</span><span><input type="number" id="editFrais" value="${data.fraisLivraison||0}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📍 Lieu</span><span><input type="text" id="editQuartier" value="${data.quartier||''}" placeholder="Quartier" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /><input type="text" id="editVille" value="${data.ville||''}" placeholder="Ville" style="width:48%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>
                <div class="recap-item"><span>📌 Statut</span><span><select id="editStatut" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;">${statutOptions}</select></span></div>
                ${data.note ? `<div class="recap-item"><span>📝 Note</span><span><input type="text" id="editNote" value="${data.note}" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;" /></span></div>` : ''}
                ${data.gains ? `
                    <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;">
                        <div style="font-weight:600;color:#2c3e50;">📊 Gains de la livraison</div>
                        <div class="recap-item"><span>💰 Total collecté</span><span>${formatNumber(data.gains.total || 0)} FCFA</span></div>
                        <div class="recap-item"><span>🚚 Part livreur</span><span>${formatNumber(data.gains.partLivreur || 0)} FCFA</span></div>
                        <div class="recap-item"><span>🏢 Part agent</span><span>${formatNumber(data.gains.partAgent || 0)} FCFA</span></div>
                        <div class="recap-item"><span>📋 Mode</span><span>${data.gains.mode || 'N/A'}</span></div>
                    </div>
                ` : ''}
                <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="enregistrerModificationsCommande('${id}')" class="btn-success" style="flex:1;padding:8px;">💾 Enregistrer</button>
                    ${data.telephone ? `<button onclick="appelerClientDepuisCommande('${data.telephone}')" class="btn-primary" style="flex:1;padding:8px;background:#25D366;">📞 Appeler</button>` : ''}
                    ${data.statut === 'En-cours' && data.livreurId ? `<button onclick="marquerLivree('${id}')" class="btn-success" style="flex:1;padding:8px;background:#27ae60;">✅ Livrée</button>` : ''}
                    <button onclick="closeDetailCommandeModal()" class="btn-secondary" style="flex:1;padding:8px;">Fermer</button>
                </div>
            </div>`;
        modal.classList.add('active');
    } catch(e) { console.error(e); showToast('❌ Erreur affichage.', 'error'); }
}

function ajouterLigneArticleEdit() {
    const container = document.getElementById('editArticlesContainer');
    const idx = container.querySelectorAll('.edit-qty').length;
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.marginBottom = '4px';
    div.innerHTML = `<input type="number" value="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-qty" />
        <input type="text" value="" placeholder="Nom" style="flex:1;padding:4px;border:1px solid #e2e8f0;border-radius:4px;" data-idx="${idx}" class="edit-name" />`;
    container.appendChild(div);
}

async function enregistrerModificationsCommande(id) {
    playSound('click');
    try {
        const qtyInputs = document.querySelectorAll('.edit-qty');
        const nameInputs = document.querySelectorAll('.edit-name');
        const articles = [];
        for (let i=0; i<qtyInputs.length; i++) {
            const nom = nameInputs[i].value.trim();
            if (nom) articles.push({ quantite: parseInt(qtyInputs[i].value)||0, nom: nom });
        }
        const updateData = {
            vendeur: document.getElementById('editVendeur').value.trim(),
            telephone: document.getElementById('editTelephone').value.trim(),
            articles: articles,
            prixTotal: parseInt(document.getElementById('editPrix').value) || 0,
            fraisLivraison: parseInt(document.getElementById('editFrais').value) || 0,
            quartier: document.getElementById('editQuartier').value.trim(),
            ville: document.getElementById('editVille').value.trim(),
            statut: document.getElementById('editStatut').value,
            note: document.getElementById('editNote')?.value.trim() || '',
            dateModification: new Date()
        };
        await db.collection('commandes').doc(id).update(updateData);
        playSound('success');
        showToast('✅ Commande mise à jour !', 'success');
        closeDetailCommandeModal();
        loadCommandes(); loadKPI();
    } catch(e) { console.error(e); showToast('❌ Erreur mise à jour.', 'error'); }
}

function appelerClientDepuisCommande(telephone) {
    playSound('click');
    const phone = telephone.replace(/[^0-9+]/g, '');
    if (phone) { window.location.href = `tel:${phone}`; }
    else { showToast('⚠️ Numéro invalide.', 'error'); }
}

function closeDetailCommandeModal() { document.getElementById('detailCommandeModal').classList.remove('active'); }

// ========== COMMANDES CRUD ==========
async function modifierCommande(id) {
    playSound('click');
    await openCommandeModal(id);
}

async function supprimerCommande(id) {
    playSound('click');
    if (!confirm('⚠️ Supprimer définitivement cette commande ?')) return;
    try {
        await db.collection('commandes').doc(id).delete();
        playSound('success');
        showToast('🗑️ Commande supprimée.', 'success');
        loadCommandes(); loadKPI();
    } catch(e) { showToast('❌ Erreur suppression.', 'error'); }
}

async function assignerCommande(commandeId) {
    playSound('click');
    try {
        const livreurs = await db.collection('livreurs').where('actif','==',true).get();
        if (livreurs.empty) { showToast('⚠️ Aucun livreur disponible.', 'error'); return; }
        let list = []; livreurs.forEach(d => list.push({ id: d.id, ...d.data() }));
        const opts = list.map((l,i) => {
            let typeLabel = '';
            if (l.type === 'interne') typeLabel = '🔒 Interne';
            else if (l.contrat === 'garde_tout') typeLabel = '💰 Garde tout';
            else typeLabel = '📊 Partage';
            return `${i+1}. ${l.nom} (${l.zone||'Sans zone'}) - ${typeLabel}`;
        }).join('\n');
        const choix = prompt(`Sélectionnez un livreur:\n\n${opts}\n\nEntrez le numéro:`);
        if (!choix) return;
        const idx = parseInt(choix)-1;
        if (isNaN(idx)||idx<0||idx>=list.length) { showToast('⚠️ Sélection invalide.', 'error'); return; }
        const livreur = list[idx];
        await db.collection('commandes').doc(commandeId).update({ 
            livreurId: livreur.id, 
            livreurNom: livreur.nom,
            livreurType: livreur.type || 'externe',
            livreurContrat: livreur.contrat || 'partage',
            statut: 'En-cours', 
            dateAssignation: new Date() 
        });
        playSound('success');
        showToast(`✅ Commande assignée à ${livreur.nom} !`, 'success');
        loadCommandes(); loadKPI();
    } catch(e) { showToast('❌ Erreur assignation.', 'error'); }
}

// ========== VENDEURS ==========
async function loadVendeurs() {
    try {
        const snapshot = await db.collection('vendeurs').orderBy('nom').get();
        const container = document.getElementById('vendeursList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>'; return; }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('vendeurId', '==', doc.id).get();
            let code = 'N/A';
            if (!userSnap.empty) { code = userSnap.docs[0].data().code_secret || 'N/A'; }
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone} | 🔑 ${code}</small></div>
                <div><button onclick="editVendeur('${doc.id}')" class="btn-edit">✏️</button>
                <button onclick="deleteVendeur('${doc.id}')" class="btn-delete">🗑️</button></div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openVendeurForm() {
    playSound('click');
    const nom = prompt('Nom du vendeur :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    const abr = prompt('Abréviation (ex: MODE) :'); if (!abr) return;
    let code = generateCodeSecret();
    db.collection('users').where('code_secret','==',code).get().then(s => {
        if (!s.empty) code = generateCodeSecret();
        return db.collection('vendeurs').add({ nom, telephone: tel, abreviation: abr.toUpperCase() });
    }).then(docRef => {
        return db.collection('users').add({ nom, role: 'vendeur', code_secret: code, telephone: tel, vendeurId: docRef.id, dateCreation: new Date() });
    }).then(() => {
        playSound('success');
        showToast(`✅ Vendeur ajouté ! Code: ${code}`, 'success');
        if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
            const phone = tel.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code vendeur HDIX est: ${code}`, '_blank');
        }
        loadVendeurs(); loadKPI();
    }).catch(e => { console.error(e); showToast('❌ Erreur.', 'error'); });
}

async function deleteVendeur(id) {
    playSound('click');
    if (!confirm('Supprimer ce vendeur ?')) return;
    try {
        const s = await db.collection('users').where('vendeurId','==',id).get();
        s.forEach(d => db.collection('users').doc(d.id).delete());
        await db.collection('vendeurs').doc(id).delete();
        playSound('success');
        showToast('✅ Vendeur supprimé.', 'success');
        loadVendeurs(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function editVendeur(id) {
    playSound('click');
    const doc = await db.collection('vendeurs').doc(id).get();
    const data = doc.data();
    const nom = prompt('Nom:', data.nom); if (!nom) return;
    const tel = prompt('Téléphone:', data.telephone); if (!tel) return;
    const abr = prompt('Abréviation:', data.abreviation); if (!abr) return;
    await db.collection('vendeurs').doc(id).update({ nom, telephone: tel, abreviation: abr.toUpperCase() });
    const s = await db.collection('users').where('vendeurId','==',id).get();
    s.forEach(d => db.collection('users').doc(d.id).update({ nom, telephone: tel }));
    playSound('success');
    showToast('✅ Vendeur modifié.', 'success');
    loadVendeurs();
}

async function resetVendeurCode(id) {
    playSound('click');
    if (!confirm('Réinitialiser le code secret de ce vendeur ?')) return;
    try {
        const newCode = await generateUniqueCode();
        const s = await db.collection('users').where('vendeurId','==',id).get();
        if (s.empty) { showToast('⚠️ Utilisateur non trouvé.', 'error'); return; }
        await db.collection('users').doc(s.docs[0].id).update({ code_secret: newCode });
        const vendeurDoc = await db.collection('vendeurs').doc(id).get();
        const vendeurData = vendeurDoc.data();
        playSound('success');
        showToast(`✅ Nouveau code: ${newCode}`, 'success');
        if (confirm(`Envoyer le nouveau code (${newCode}) par WhatsApp ?`)) {
            const phone = vendeurData.telephone.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${vendeurData.nom}, votre nouveau code HDIX est: ${newCode}`, '_blank');
        }
        loadVendeurs();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== RÉPARER LES VENDEURS ==========
async function reparerVendeurs() {
    playSound('click');
    if (!confirm('🔧 Voulez-vous réparer automatiquement les comptes vendeurs ?\n\nCette action va :\n- Vérifier tous les vendeurs\n- Créer les comptes utilisateurs manquants\n- Lier les vendeurs aux comptes utilisateurs\n- Générer des codes secrets pour ceux qui n\'en ont pas')) {
        return;
    }

    showSpinner();
    let stats = { total: 0, crees: 0, dejaOk: 0, erreurs: 0 };
    let details = [];

    try {
        const vendeursSnap = await db.collection('vendeurs').get();
        stats.total = vendeursSnap.size;

        if (vendeursSnap.empty) {
            hideSpinner();
            showToast('⚠️ Aucun vendeur à réparer.', 'info');
            return;
        }

        for (const doc of vendeursSnap.docs) {
            const vendeurData = doc.data();
            const vendeurId = doc.id;

            const userSnap = await db.collection('users')
                .where('vendeurId', '==', vendeurId)
                .get();

            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                if (!userData.code_secret) {
                    const newCode = generateCodeSecret();
                    await db.collection('users').doc(userSnap.docs[0].id).update({
                        code_secret: newCode
                    });
                    stats.dejaOk++;
                    details.push(`✅ ${vendeurData.nom} : code secret ajouté (${newCode})`);
                } else {
                    stats.dejaOk++;
                    details.push(`✅ ${vendeurData.nom} : déjà OK`);
                }
            } else {
                const newCode = generateCodeSecret();
                await db.collection('users').add({
                    nom: vendeurData.nom,
                    role: 'vendeur',
                    code_secret: newCode,
                    telephone: vendeurData.telephone || '',
                    vendeurId: vendeurId,
                    dateCreation: new Date()
                });
                stats.crees++;
                details.push(`🆕 ${vendeurData.nom} : compte créé (${newCode})`);
            }
        }

        hideSpinner();
        playSound('success');

        let message = `✅ Réparation terminée !\n\n`;
        message += `📊 Total vendeurs : ${stats.total}\n`;
        message += `🆕 Comptes créés : ${stats.crees}\n`;
        message += `✅ Déjà OK : ${stats.dejaOk}\n`;
        message += `❌ Erreurs : ${stats.erreurs}\n\n`;
        message += `📋 Détail :\n${details.slice(0, 20).join('\n')}`;
        if (details.length > 20) {
            message += `\n... et ${details.length - 20} autres.`;
        }

        alert(message);
        loadVendeurs();

        if (stats.crees > 0) {
            if (confirm(`📱 ${stats.crees} nouveaux codes ont été générés. Voulez-vous les envoyer par WhatsApp aux vendeurs concernés ?`)) {
                const repairedSnap = await db.collection('users')
                    .where('role', '==', 'vendeur')
                    .where('dateCreation', '>=', new Date(Date.now() - 60000))
                    .get();
                let count = 0;
                for (const doc of repairedSnap.docs) {
                    const data = doc.data();
                    if (data.telephone && data.code_secret) {
                        const phone = data.telephone.replace('+', '');
                        const messageWA = `Bonjour ${data.nom},\n\nVotre compte vendeur HDIX a été activé.\n🔑 Code : ${data.code_secret}\n\nLien : https://hdix.vercel.app`;
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageWA)}`, '_blank');
                        count++;
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                showToast(`✅ ${count} messages WhatsApp ouverts !`, 'success');
            }
        }

    } catch (error) {
        console.error('Erreur réparation:', error);
        hideSpinner();
        playSound('error');
        showToast('❌ Erreur lors de la réparation.', 'error');
    }
}

// ========== AGENTS ==========
async function loadAgents() {
    try {
        const snapshot = await db.collection('users').where('role','==','agent').get();
        const container = document.getElementById('agentsList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun agent.</p>'; return; }
        const agents = []; snapshot.forEach(doc => { agents.push({ id: doc.id, ...doc.data() }); });
        agents.sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
        let html = '<div class="list-container">';
        for (const data of agents) {
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>📞 ${data.telephone||'N/A'} | 🔑 ${data.code_secret||'N/A'}</small></div>
                <div><button onclick="editAgent('${data.id}')" class="btn-edit">✏️</button>
                <button onclick="deleteAgent('${data.id}')" class="btn-delete">🗑️</button></div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openAgentForm() {
    playSound('click');
    const nom = prompt('Nom de l\'agent :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    let code = generateCodeSecret();
    db.collection('users').add({ nom, role: 'agent', code_secret: code, telephone: tel, dateCreation: new Date() })
        .then(() => {
            playSound('success');
            showToast(`✅ Agent ajouté ! Code: ${code}`, 'success');
            if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
                const phone = tel.replace('+','');
                window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code agent HDIX est: ${code}`, '_blank');
            }
            loadAgents(); loadKPI();
        }).catch(e => { showToast('❌ Erreur.', 'error'); });
}

async function deleteAgent(id) {
    playSound('click');
    if (!confirm('Supprimer cet agent ?')) return;
    try {
        await db.collection('users').doc(id).delete();
        playSound('success');
        showToast('✅ Agent supprimé.', 'success');
        loadAgents(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function editAgent(id) {
    playSound('click');
    const doc = await db.collection('users').doc(id).get();
    const data = doc.data();
    const nom = prompt('Nom:', data.nom); if (!nom) return;
    const tel = prompt('Téléphone:', data.telephone); if (!tel) return;
    await db.collection('users').doc(id).update({ nom, telephone: tel });
    playSound('success');
    showToast('✅ Agent modifié.', 'success');
    loadAgents();
}

async function resetAgentCode(id) {
    playSound('click');
    if (!confirm('Réinitialiser le code secret de cet agent ?')) return;
    try {
        const newCode = await generateUniqueCode();
        await db.collection('users').doc(id).update({ code_secret: newCode });
        const doc = await db.collection('users').doc(id).get();
        const data = doc.data();
        playSound('success');
        showToast(`✅ Nouveau code: ${newCode}`, 'success');
        if (confirm(`Envoyer le nouveau code (${newCode}) par WhatsApp ?`)) {
            const phone = data.telephone.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${data.nom}, votre nouveau code agent HDIX est: ${newCode}`, '_blank');
        }
        loadAgents();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== LIVREURS ==========
async function loadLivreurs() {
    try {
        const snapshot = await db.collection('livreurs').orderBy('nom').get();
        const container = document.getElementById('livreursList');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun livreur.</p>'; return; }
        let html = '<div class="list-container">';
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userSnap = await db.collection('users').where('livreurId','==',doc.id).get();
            let code = 'N/A';
            if (!userSnap.empty) { code = userSnap.docs[0].data().code_secret || 'N/A'; }
            
            // Type de contrat
            let typeLabel = '';
            if (data.type === 'interne') typeLabel = '🔒 Interne';
            else if (data.contrat === 'garde_tout') typeLabel = '💰 Garde tout';
            else typeLabel = '📊 Partage';
            
            // Gains
            const gains = data.gains || {};
            const totalCollecte = gains.total_collecte || 0;
            const partLivreur = gains.part_livreur || 0;
            
            html += `<div class="list-item">
                <div>
                    <strong>${data.nom}</strong>
                    <br><small>📞 ${data.telephone} | ${typeLabel} | 📍 ${data.zone||'N/A'}</small>
                    <br><small>💰 ${formatNumber(partLivreur)} FCFA / ${formatNumber(totalCollecte)} FCFA collecté</small>
                </div>
                <div>
                    <button onclick="editLivreur('${doc.id}')" class="btn-edit">✏️</button>
                    <button onclick="deleteLivreur('${doc.id}')" class="btn-delete">🗑️</button>
                </div>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openLivreurForm() {
    playSound('click');
    const nom = prompt('Nom du livreur :'); if (!nom) return;
    const tel = prompt('Téléphone :'); if (!tel) return;
    
    // Choix du type
    const choixType = prompt(
        `Choisissez le type de contrat :\n\n` +
        `1. 🔒 Interne (salarié) - L'entreprise garde tout\n` +
        `2. 📊 Externe - Partage (fixe + livreur)\n` +
        `3. 💰 Externe - Garde tout (tout pour le livreur)\n\n` +
        `Entrez 1, 2 ou 3 :`
    );
    
    let type = 'externe';
    let contrat = 'partage';
    if (choixType === '1') { type = 'interne'; contrat = 'salarie'; }
    else if (choixType === '3') { type = 'externe'; contrat = 'garde_tout'; }
    else { type = 'externe'; contrat = 'partage'; }
    
    const zone = prompt('Zone de livraison :'); if (!zone) return;
    const cap = parseInt(prompt('Capacité :') || '10');
    const actif = confirm('Activer ?');
    let code = generateCodeSecret();
    const tauxPartAgent = {
        'Libreville': 500,
        'Nzeng-Ayong': 500,
        'Akanda': 1000,
        'Owendo': 1000,
        'zones_difficiles': 1000,
        'autres': 1000
    };
    
    db.collection('livreurs').add({ 
        nom, telephone: tel, zone, capacite: cap||10, actif, type, contrat,
        taux_part_agent: tauxPartAgent,
        gains: { total_collecte: 0, part_livreur: 0, part_agent: 0 }
    })
    .then(docRef => {
        return db.collection('users').add({ nom, role: 'livreur', code_secret: code, telephone: tel, livreurId: docRef.id, dateCreation: new Date() });
    })
    .then(() => {
        playSound('success');
        showToast(`✅ Livreur ajouté ! Code: ${code}`, 'success');
        if (confirm(`Envoyer le code (${code}) par WhatsApp ?`)) {
            const phone = tel.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${nom}, votre code livreur HDIX est: ${code}`, '_blank');
        }
        loadLivreurs(); loadKPI();
    }).catch(e => { showToast('❌ Erreur.', 'error'); });
}

async function deleteLivreur(id) {
    playSound('click');
    if (!confirm('Supprimer ce livreur ?')) return;
    try {
        const s = await db.collection('users').where('livreurId','==',id).get();
        s.forEach(d => db.collection('users').doc(d.id).delete());
        await db.collection('livreurs').doc(id).delete();
        playSound('success');
        showToast('✅ Livreur supprimé.', 'success');
        loadLivreurs(); loadKPI();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function editLivreur(id) {
    playSound('click');
    const doc = await db.collection('livreurs').doc(id).get();
    const data = doc.data();
    const nom = prompt('Nom:', data.nom); if (!nom) return;
    const tel = prompt('Téléphone:', data.telephone); if (!tel) return;
    const zone = prompt('Zone:', data.zone||''); if (!zone) return;
    const cap = parseInt(prompt('Capacité:', data.capacite||10));
    const actif = confirm(`Actif ? (OK=Oui)`);
    await db.collection('livreurs').doc(id).update({ nom, telephone: tel, zone, capacite: cap||10, actif });
    const s = await db.collection('users').where('livreurId','==',id).get();
    s.forEach(d => db.collection('users').doc(d.id).update({ nom, telephone: tel }));
    playSound('success');
    showToast('✅ Livreur modifié.', 'success');
    loadLivreurs();
}

async function resetLivreurCode(id) {
    playSound('click');
    if (!confirm('Réinitialiser le code secret de ce livreur ?')) return;
    try {
        const newCode = await generateUniqueCode();
        const s = await db.collection('users').where('livreurId','==',id).get();
        if (s.empty) { showToast('⚠️ Utilisateur non trouvé.', 'error'); return; }
        await db.collection('users').doc(s.docs[0].id).update({ code_secret: newCode });
        const livreurDoc = await db.collection('livreurs').doc(id).get();
        const livreurData = livreurDoc.data();
        playSound('success');
        showToast(`✅ Nouveau code: ${newCode}`, 'success');
        if (confirm(`Envoyer le nouveau code (${newCode}) par WhatsApp ?`)) {
            const phone = livreurData.telephone.replace('+','');
            window.open(`https://wa.me/${phone}?text=Bonjour ${livreurData.nom}, votre nouveau code HDIX est: ${newCode}`, '_blank');
        }
        loadLivreurs();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== RÉPARER LES LIVREURS (MIGRATION) ==========
async function reparerLivreurs() {
    playSound('click');
    if (!confirm('🔧 Voulez-vous réparer automatiquement les comptes livreurs ?\n\nCette action va :\n- Vérifier tous les livreurs\n- Ajouter les champs manquants (type, contrat, gains)\n- Créer les comptes utilisateurs manquants\n- Générer des codes secrets pour ceux qui n\'en ont pas')) {
        return;
    }

    showSpinner();
    let stats = { total: 0, crees: 0, migres: 0, dejaOk: 0, erreurs: 0 };
    let details = [];

    try {
        const livreursSnap = await db.collection('livreurs').get();
        stats.total = livreursSnap.size;

        if (livreursSnap.empty) {
            hideSpinner();
            showToast('⚠️ Aucun livreur à réparer.', 'info');
            return;
        }

        for (const doc of livreursSnap.docs) {
            const livreurData = doc.data();
            const livreurId = doc.id;
            let modifie = false;

            // 1. Ajouter les champs manquants (type, contrat, gains)
            const updateData = {};
            if (!livreurData.type) {
                updateData.type = 'externe';
                updateData.contrat = 'partage';
                modifie = true;
            }
            if (!livreurData.contrat) {
                updateData.contrat = 'partage';
                modifie = true;
            }
            if (!livreurData.gains) {
                updateData.gains = { total_collecte: 0, part_livreur: 0, part_agent: 0 };
                modifie = true;
            }
            if (!livreurData.taux_part_agent) {
                updateData.taux_part_agent = {
                    'Libreville': 500,
                    'Nzeng-Ayong': 500,
                    'Akanda': 1000,
                    'Owendo': 1000,
                    'zones_difficiles': 1000,
                    'autres': 1000
                };
                modifie = true;
            }

            if (modifie) {
                await db.collection('livreurs').doc(livreurId).update(updateData);
                stats.migres++;
                details.push(`🔄 ${livreurData.nom} : champs ajoutés`);
            }

            // 2. Vérifier l'utilisateur associé
            const userSnap = await db.collection('users')
                .where('livreurId', '==', livreurId)
                .get();

            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                if (!userData.code_secret) {
                    const newCode = generateCodeSecret();
                    await db.collection('users').doc(userSnap.docs[0].id).update({
                        code_secret: newCode
                    });
                    stats.dejaOk++;
                    details.push(`✅ ${livreurData.nom} : code secret ajouté (${newCode})`);
                } else {
                    stats.dejaOk++;
                    details.push(`✅ ${livreurData.nom} : déjà OK`);
                }
            } else {
                const newCode = generateCodeSecret();
                await db.collection('users').add({
                    nom: livreurData.nom,
                    role: 'livreur',
                    code_secret: newCode,
                    telephone: livreurData.telephone || '',
                    livreurId: livreurId,
                    dateCreation: new Date()
                });
                stats.crees++;
                details.push(`🆕 ${livreurData.nom} : compte créé (${newCode})`);
            }
        }

        hideSpinner();
        playSound('success');

        let message = `✅ Réparation des livreurs terminée !\n\n`;
        message += `📊 Total livreurs : ${stats.total}\n`;
        message += `🔄 Livreurs migrés : ${stats.migres}\n`;
        message += `🆕 Comptes créés : ${stats.crees}\n`;
        message += `✅ Déjà OK : ${stats.dejaOk}\n`;
        message += `❌ Erreurs : ${stats.erreurs}\n\n`;
        message += `📋 Détail :\n${details.slice(0, 20).join('\n')}`;
        if (details.length > 20) {
            message += `\n... et ${details.length - 20} autres.`;
        }

        alert(message);
        loadLivreurs();

        if (stats.crees > 0) {
            if (confirm(`📱 ${stats.crees} nouveaux codes ont été générés. Voulez-vous les envoyer par WhatsApp aux livreurs concernés ?`)) {
                const repairedSnap = await db.collection('users')
                    .where('role', '==', 'livreur')
                    .where('dateCreation', '>=', new Date(Date.now() - 60000))
                    .get();
                let count = 0;
                for (const doc of repairedSnap.docs) {
                    const data = doc.data();
                    if (data.telephone && data.code_secret) {
                        const phone = data.telephone.replace('+', '');
                        const messageWA = `Bonjour ${data.nom},\n\nVotre compte livreur HDIX a été activé.\n🔑 Code : ${data.code_secret}\n\nLien : https://hdix.vercel.app`;
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageWA)}`, '_blank');
                        count++;
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                showToast(`✅ ${count} messages WhatsApp ouverts !`, 'success');
            }
        }

    } catch (error) {
        console.error('Erreur réparation livreurs:', error);
        hideSpinner();
        playSound('error');
        showToast('❌ Erreur lors de la réparation des livreurs.', 'error');
    }
}

// ========== INSCRIPTIONS AVEC MODALE POUR LIVREUR ==========
let acceptationEnCours = null;

async function loadInscriptions() {
    try {
        const container = document.getElementById('inscriptionsList');
        container.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
        const snapshot = await db.collection('inscriptions')
            .orderBy('dateDemande', 'desc')
            .get();
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucune demande d\'inscription.</p>';
            return;
        }
        let html = `
            <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="filtrerInscriptions('toutes')" class="filter-btn active" data-filter="toutes">📋 Toutes</button>
                <button onclick="filtrerInscriptions('en_attente')" class="filter-btn" data-filter="en_attente" style="background:#fef9e7;">⏳ En attente</button>
                <button onclick="filtrerInscriptions('acceptée')" class="filter-btn" data-filter="acceptée" style="background:#eafaf1;">✅ Acceptées</button>
                <button onclick="filtrerInscriptions('refusée')" class="filter-btn" data-filter="refusée" style="background:#fdedec;">❌ Refusées</button>
            </div>
            <div id="inscriptionsListContainer">
        `;
        snapshot.forEach(doc => {
            const data = doc.data();
            const statut = data.statut || 'en_attente';
            const statutClass = statut === 'acceptée' ? 'statut-livree' : statut === 'refusée' ? 'statut-indisponible' : 'statut-appel';
            const statutLabel = statut === 'acceptée' ? '✅ Acceptée' : statut === 'refusée' ? '❌ Refusée' : '⏳ En attente';
            const code = statut === 'acceptée' && data.codeSecret ? data.codeSecret : '';
            const telephone = data.telephone || '';
            
            // Déterminer le rôle avec icône
            let roleLabel = data.role === 'livreur' ? '🚚 Livreur' : data.role === 'vendeur' ? '🏪 Vendeur' : '👤 Agent';
            
            html += `
                <div class="commande-item inscription-item" data-statut="${statut}">
                    <span class="numero">${data.nom || 'Inconnu'}</span>
                    <span class="vendeur">📞 ${telephone}</span>
                    <span class="localisation">${roleLabel}</span>
                    ${code ? `
                        <span class="montant" style="color:#8e44ad;font-weight:700;">🔑 ${code}</span>
                        <span class="actions" style="display:flex;gap:4px;flex-shrink:0;">
                            <button onclick="copierCode('${code}')" title="Copier le code" style="background:#e2e8f0;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;">📋</button>
                            <button onclick="envoyerCodeWhatsApp('${code}', '${telephone}', '${data.nom || ''}')" title="Envoyer par WhatsApp" style="background:#25D366;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;color:white;font-size:12px;">💬</button>
                        </span>
                    ` : ''}
                    <span class="statut ${statutClass}">${statutLabel}</span>
                    <span class="actions">
                        ${statut === 'en_attente' ? `
                            ${data.role === 'livreur' ? `
                                <button onclick="ouvrirModalAccepterLivreur('${doc.id}')" class="btn-success" style="padding:4px 8px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;background:#27ae60;">✅</button>
                            ` : `
                                <button onclick="accepterInscriptionSimple('${doc.id}')" class="btn-success" style="padding:4px 8px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;background:#27ae60;">✅</button>
                            `}
                            <button onclick="refuserInscription('${doc.id}')" class="btn-danger" style="padding:4px 8px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;">❌</button>
                        ` : `
                            <span style="color:#6b7a8f;font-size:11px;">✓</span>
                        `}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur inscriptions:', error);
        document.getElementById('inscriptionsList').innerHTML = `<p class="empty-message" style="color:#c0392b;">❌ Erreur : ${error.message}</p>`;
    }
}

function copierCode(code) {
    playSound('click');
    navigator.clipboard.writeText(code).then(() => {
        playSound('success');
        showToast(`✅ Code "${code}" copié !`, 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`✅ Code "${code}" copié !`, 'success');
    });
}

function envoyerCodeWhatsApp(code, telephone, nom) {
    playSound('click');
    if (!telephone) { showToast('⚠️ Numéro manquant.', 'error'); return; }
    const phone = telephone.replace(/[^0-9+]/g, '');
    const message = `Bonjour ${nom || 'client'},\n\nVotre compte HDIX a été activé.\n🔑 Code : ${code}\n\nLien : https://hdix.vercel.app`;
    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast('💬 Ouverture WhatsApp...', 'info');
}

let filtreInscriptions = 'toutes';
function filtrerInscriptions(statut) {
    playSound('click');
    filtreInscriptions = statut;
    document.querySelectorAll('#inscriptionsList .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === statut));
    document.querySelectorAll('.inscription-item').forEach(el => {
        el.style.display = statut === 'toutes' || el.dataset.statut === statut ? 'flex' : 'none';
    });
}

// ========== OUVERTURE MODALE ACCEPTATION LIVREUR ==========
async function ouvrirModalAccepterLivreur(id) {
    playSound('click');
    try {
        const doc = await db.collection('inscriptions').doc(id).get();
        const data = doc.data();
        
        if (!data) { showToast('❌ Demande introuvable', 'error'); return; }
        
        // Remplir la modale
        document.getElementById('modalNom').textContent = data.nom || 'Inconnu';
        document.getElementById('modalTelephone').textContent = data.telephone || 'Non fourni';
        document.getElementById('modalBoutique').textContent = data.boutique || 'Aucune';
        
        // Réinitialiser les champs
        document.getElementById('modalTypeContrat').value = 'externe_partage';
        document.getElementById('modalZone').value = 'Libreville';
        document.getElementById('modalCapacite').value = 10;
        
        // Stocker l'ID pour validation
        acceptationEnCours = id;
        
        // Afficher la modale
        document.getElementById('modalAccepterLivreur').classList.add('active');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du chargement', 'error');
    }
}

function fermerModalAccepter() {
    document.getElementById('modalAccepterLivreur').classList.remove('active');
    acceptationEnCours = null;
}

async function validerAcceptationLivreur() {
    if (!acceptationEnCours) {
        showToast('⚠️ Aucune demande en cours', 'error');
        return;
    }
    
    const id = acceptationEnCours;
    const typeContrat = document.getElementById('modalTypeContrat').value;
    const zone = document.getElementById('modalZone').value;
    const capacite = parseInt(document.getElementById('modalCapacite').value) || 10;
    
    let type = 'externe';
    let contrat = 'partage';
    if (typeContrat === 'interne') {
        type = 'interne';
        contrat = 'salarie';
    } else if (typeContrat === 'externe_garde_tout') {
        type = 'externe';
        contrat = 'garde_tout';
    }
    
    await accepterInscriptionLivreur(id, type, contrat, zone, capacite);
    fermerModalAccepter();
}

async function accepterInscriptionLivreur(id, type, contrat, zone, capacite) {
    showSpinner();
    try {
        const doc = await db.collection('inscriptions').doc(id).get();
        const data = doc.data();
        
        if (!data) { showToast('❌ Demande introuvable', 'error'); hideSpinner(); return; }
        
        // Générer un code unique
        const code = await generateUniqueCode();
        
        // Créer le livreur
        const tauxPartAgent = {
            'Libreville': 500,
            'Nzeng-Ayong': 500,
            'Akanda': 1000,
            'Owendo': 1000,
            'zones_difficiles': 1000,
            'autres': 1000
        };
        
        const livreurRef = await db.collection('livreurs').add({
            nom: data.nom,
            telephone: data.telephone,
            zone: zone,
            capacite: capacite,
            actif: true,
            type: type,
            contrat: contrat,
            taux_part_agent: tauxPartAgent,
            gains: {
                total_collecte: 0,
                part_livreur: 0,
                part_agent: 0
            },
            dateCreation: new Date()
        });
        
        // Créer l'utilisateur
        await db.collection('users').add({
            nom: data.nom,
            role: 'livreur',
            code_secret: code,
            telephone: data.telephone,
            livreurId: livreurRef.id,
            boutique: data.boutique || '',
            dateCreation: new Date()
        });
        
        // Marquer l'inscription comme acceptée
        await db.collection('inscriptions').doc(id).update({
            statut: 'acceptée',
            dateTraitement: new Date(),
            codeSecret: code,
            livreurId: livreurRef.id
        });
        
        // Message de confirmation
        let typeLabel = '';
        if (type === 'interne') typeLabel = '🔒 Interne (salarié)';
        else if (contrat === 'garde_tout') typeLabel = '💰 Externe - Garde tout';
        else typeLabel = '📊 Externe - Partage';
        
        playSound('success');
        showToast(`✅ Livreur accepté !\n📋 ${data.nom} - ${typeLabel}\n🔑 Code: ${code}`, 'success');
        
        // Envoyer le code par WhatsApp
        if (data.telephone) {
            const phone = data.telephone.replace(/[^0-9+]/g, '');
            const message = `Bonjour ${data.nom},\n\nVotre compte livreur HDIX a été activé.\n🔑 Code : ${code}\n📋 Type : ${typeLabel}\n📍 Zone : ${zone}\n📦 Capacité : ${capacite} colis\n\nLien : https://hdix.vercel.app`;
            if (confirm(`📱 Envoyer le code par WhatsApp à ${data.nom} ?`)) {
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
            }
        }
        
        // Recharger les listes
        loadInscriptions();
        loadLivreurs();
        loadKPI();
        
    } catch (error) {
        console.error('Erreur acceptation livreur:', error);
        showToast('❌ Erreur lors de l\'acceptation.', 'error');
    }
    hideSpinner();
}

// ========== ACCEPTATION SIMPLE (Vendeurs/Agents) ==========
async function accepterInscriptionSimple(id) {
    showSpinner();
    try {
        const doc = await db.collection('inscriptions').doc(id).get();
        const data = doc.data();
        const code = await generateUniqueCode();
        
        if (data.role === 'vendeur') {
            const vendeurRef = await db.collection('vendeurs').add({
                nom: data.nom,
                telephone: data.telephone,
                abreviation: data.abreviation || 'VEN' + Math.floor(Math.random() * 1000),
                dateCreation: new Date()
            });
            await db.collection('users').add({
                nom: data.nom,
                role: 'vendeur',
                code_secret: code,
                telephone: data.telephone,
                vendeurId: vendeurRef.id,
                boutique: data.boutique || '',
                dateCreation: new Date()
            });
            await db.collection('inscriptions').doc(id).update({
                statut: 'acceptée',
                dateTraitement: new Date(),
                codeSecret: code,
                vendeurId: vendeurRef.id
            });
            showToast(`✅ Vendeur accepté ! Code: ${code}`, 'success');
            loadInscriptions();
            loadVendeurs();
            loadKPI();
        } else if (data.role === 'agent') {
            await db.collection('users').add({
                nom: data.nom,
                role: 'agent',
                code_secret: code,
                telephone: data.telephone,
                dateCreation: new Date()
            });
            await db.collection('inscriptions').doc(id).update({
                statut: 'acceptée',
                dateTraitement: new Date(),
                codeSecret: code
            });
            showToast(`✅ Agent accepté ! Code: ${code}`, 'success');
            loadInscriptions();
            loadAgents();
            loadKPI();
        }
    } catch (error) {
        console.error('Erreur acceptation simple:', error);
        showToast('❌ Erreur acceptation.', 'error');
    }
    hideSpinner();
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
        console.error('Erreur refus:', error);
        showToast('❌ Erreur refus.', 'error');
    }
}

// ========== BILAN ==========
async function generateBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    const container = document.getElementById('bilanContainer');
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune commande.</p>'; return; }
        let totalVentes=0, totalFrais=0, livrees=0, details=[];
        const stats = {'À appeler':0,'En-cours':0,'Livrée':0,'Indisponible':0,'Va rappeler':0,'Annulée':0,'Refusée':0,'Reportée':0};
        let vendeurNom='';
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur||'Inconnu';
            totalVentes += data.prixTotal||0;
            totalFrais += data.fraisLivraison||0;
            stats[data.statut] = (stats[data.statut]||0)+1;
            if (data.statut === 'Livrée') livrees++;
            details.push(`${data.numero} (${data.quartier||'?'}) : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const aEnvoyer = totalVentes - totalFrais;
        let s = '';
        for (const [k,v] of Object.entries(stats)) s += `<div><strong>${k} :</strong> ${v}</div>`;
        container.innerHTML = `<div class="bilan-result"><h4>📊 Bilan - ${vendeurNom}</h4><div class="bilan-stats">${s}</div>
            <div class="bilan-stats" style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px;">
            <div><strong>💰 Total :</strong> ${formatNumber(totalVentes)} FCFA</div><div><strong>🚚 Livraison :</strong> ${formatNumber(totalFrais)} FCFA</div>
            <div><strong>📤 À envoyer :</strong> ${formatNumber(aEnvoyer)} FCFA</div><div><strong>✅ Livrées :</strong> ${livrees}/${snapshot.size}</div></div>
            <div class="bilan-details"><strong>📦 Détail :</strong><br>${details.join('<br>')}</div></div>`;
    } catch(e) { showToast('❌ Erreur bilan.', 'error'); }
}

async function copyBilan() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        let query = db.collection('commandes').where('dateCreation','>=',today).where('dateCreation','<',tomorrow);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { showToast('⚠️ Aucune commande.', 'error'); return; }
        let totalVentes=0, totalFrais=0, vendeurNom='';
        const stats={'À appeler':0,'En-cours':0,'Livrée':0,'Indisponible':0,'Va rappeler':0,'Annulée':0,'Refusée':0,'Reportée':0};
        let details=[];
        snapshot.forEach(doc => {
            const data = doc.data();
            vendeurNom = data.vendeur||'Inconnu';
            totalVentes += data.prixTotal||0;
            totalFrais += data.fraisLivraison||0;
            stats[data.statut] = (stats[data.statut]||0)+1;
            details.push(`${data.numero} (${data.quartier||'?'}) : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const aEnvoyer = totalVentes - totalFrais;
        const dateStr = today.toLocaleDateString('fr-FR');
        let text = `📊 BILAN DU ${dateStr} - ${vendeurNom}\n\n`;
        text += `🔴 À appeler    : ${stats['À appeler']}\n🔴 En-cours     : ${stats['En-cours']}\n🔴 Livrée       : ${stats['Livrée']}\n`;
        text += `🔴 Indisponible : ${stats['Indisponible']}\n🔴 Va rappeler  : ${stats['Va rappeler']}\n🔴 Annulée      : ${stats['Annulée']}\n`;
        text += `🔴 Refusée      : ${stats['Refusée']}\n🔴 Reportée     : ${stats['Reportée']}\n\n`;
        text += `💰 Montant total   : ${formatNumber(totalVentes)} FCFA\n🚚 Livraison total : ${formatNumber(totalFrais)} FCFA\n📤 À envoyer       : ${formatNumber(aEnvoyer)} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        await navigator.clipboard.writeText(text);
        playSound('success');
        showToast('✅ Bilan copié !', 'success');
    } catch(e) { showToast('❌ Erreur copie.', 'error'); }
}

async function generatePDF() {
    playSound('click');
    showToast('📄 PDF bientôt disponible.', 'info');
}

async function envoyerBilanWhatsApp() {
    playSound('click');
    const vendeur = document.getElementById('bilanVendeurSelect').value;
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        let query = db.collection('commandes').where('dateCreation','>=',today);
        if (vendeur !== 'all') query = query.where('vendeur','==',vendeur);
        const snapshot = await query.get();
        if (snapshot.empty) { showToast('⚠️ Aucune commande.', 'error'); return; }
        let total=0, vendeurNom='', details=[];
        snapshot.forEach(doc => {
            const data=doc.data();
            vendeurNom=data.vendeur||'Inconnu';
            total += data.prixTotal||0;
            details.push(`${data.numero} : ${formatNumber(data.prixTotal)} FCFA - ${data.statut}`);
        });
        const msg = `📊 BILAN DU ${today.toLocaleDateString('fr-FR')} - ${vendeurNom}\n\n💰 Total : ${formatNumber(total)} FCFA\n\n📦 Détail :\n${details.join('\n')}`;
        const phone = prompt('Numéro WhatsApp du vendeur :');
        if (phone) { window.open(`https://wa.me/${phone.replace('+','')}?text=${encodeURIComponent(msg)}`, '_blank'); }
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== STOCKAGE ==========
async function loadStockage() {
    try {
        const vendeurs = await db.collection('vendeurs').get();
        const container = document.getElementById('stockageList');
        const resume = document.getElementById('stockageResume');
        const dettes = document.getElementById('stockageDettes');
        if (vendeurs.empty) { container.innerHTML = '<p class="empty-message">Aucun vendeur.</p>'; return; }
        let html = '<div class="list-container">', totalCasiers=0, totalDettes=0;
        for (const doc of vendeurs.docs) {
            const data = doc.data();
            const s = await db.collection('stockage').where('vendeurId','==',doc.id).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
            let casiers=0, dette=0;
            if (!s.empty) { const d=s.docs[0].data(); casiers=d.casiers||0; dette=d.dette||0; }
            totalCasiers += casiers; totalDettes += dette;
            html += `<div class="list-item"><div><strong>${data.nom}</strong><br><small>Casiers: ${casiers} | Dette: ${formatNumber(dette)} FCFA</small></div>
                <div><button onclick="ajouterCasier('${doc.id}')" class="btn-edit">+</button>
                <button onclick="retirerCasier('${doc.id}')" class="btn-delete">-</button></div></div>`;
        }
        html += '</div>'; container.innerHTML = html;
        resume.innerHTML = `<div style="font-size:18px;font-weight:700;">${totalCasiers}</div><div style="color:#6b7a8f;">casiers</div>`;
        dettes.innerHTML = `<div style="font-size:18px;font-weight:700;color:${totalDettes>0?'#c0392b':'#2d7d46'};">${formatNumber(totalDettes)} FCFA</div><div style="color:#6b7a8f;">dette</div>`;
    } catch(e) { console.error(e); }
}

async function ajouterCasier(vendeurId) {
    const n = parseInt(prompt('Nombre de casiers à ajouter :')||'1');
    if (isNaN(n)||n<=0) return;
    try {
        const s = await db.collection('stockage').where('vendeurId','==',vendeurId).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        if (s.empty) {
            await db.collection('stockage').add({ vendeurId, casiers: n, dette: n*5000, mois: new Date().getMonth()+1, annee: new Date().getFullYear() });
        } else {
            const doc = s.docs[0]; const data=doc.data();
            const newCasiers=(data.casiers||0)+n;
            await db.collection('stockage').doc(doc.id).update({ casiers: newCasiers, dette: newCasiers*5000 });
        }
        playSound('success');
        showToast(`✅ ${n} casier(s) ajouté(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function retirerCasier(vendeurId) {
    try {
        const s = await db.collection('stockage').where('vendeurId','==',vendeurId).where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        if (s.empty) { showToast('⚠️ Aucun casier.', 'error'); return; }
        const doc=s.docs[0]; const data=doc.data();
        const actuel=data.casiers||0;
        if (actuel<=0) { showToast('⚠️ Aucun casier.', 'error'); return; }
        const n=parseInt(prompt(`Casiers actuels: ${actuel}. Combien retirer ?`)||'1');
        if (isNaN(n)||n<=0) return;
        const nouveau=Math.max(0, actuel-n);
        await db.collection('stockage').doc(doc.id).update({ casiers: nouveau, dette: nouveau*5000 });
        playSound('success');
        showToast(`✅ ${n} casier(s) retiré(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function activerPrelevements() {
    playSound('click');
    if (!confirm('Activer les prélèvements pour tous les vendeurs ?')) return;
    try {
        const s = await db.collection('stockage').where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        let count=0;
        for(const doc of s.docs) { await db.collection('stockage').doc(doc.id).update({ prelevementsActifs: true, dateActivation: new Date() }); count++; }
        playSound('success');
        showToast(`✅ Prélèvements activés pour ${count} vendeur(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

async function appliquerPenalites() {
    playSound('click');
    if (!confirm('Appliquer les pénalités de 2.500 FCFA/jour ?')) return;
    try {
        const s = await db.collection('stockage').where('mois','==',new Date().getMonth()+1).where('annee','==',new Date().getFullYear()).get();
        let count=0;
        for(const doc of s.docs) {
            const data=doc.data();
            if(data.dette>0) {
                await db.collection('stockage').doc(doc.id).update({ dette: (data.dette||0)+2500, penalites: (data.penalites||0)+2500, dernierJourRetard: new Date() });
                count++;
            }
        }
        playSound('success');
        showToast(`✅ Pénalités appliquées à ${count} vendeur(s)`, 'success');
        loadStockage();
    } catch(e) { showToast('❌ Erreur.', 'error'); }
}

// ========== STOCK ==========
async function openStockModal() {
    playSound('click');
    document.getElementById('stockModal').classList.add('active');
    await loadVendeursForSelect('stockVendeurSelect');
    document.getElementById('stockArticlesContainer').innerHTML = '';
    addStockRow();
}

function closeStockModal() {
    playSound('click');
    document.getElementById('stockModal').classList.remove('active');
}

function addStockRow() {
    playSound('click');
    const container = document.getElementById('stockArticlesContainer');
    const row = document.createElement('div');
    row.className = 'article-row';
    row.innerHTML = `<input type="text" class="stock-article-name" placeholder="Nom" /><input type="number" class="stock-article-qty" placeholder="Qté" min="1" value="1" />`;
    container.appendChild(row);
}

async function saveStock() {
    const select = document.getElementById('stockVendeurSelect');
    const vendeurId = select.value;
    if (!vendeurId) { showToast('⚠️ Sélectionnez un vendeur.', 'error'); return; }
    const rows = document.querySelectorAll('#stockArticlesContainer .article-row');
    const articles = [];
    rows.forEach(row => {
        const name = row.querySelector('.stock-article-name').value.trim();
        const qty = parseInt(row.querySelector('.stock-article-qty').value);
        if (name && qty > 0) articles.push({ nom: name, quantite: qty });
    });
    if (articles.length === 0) { showToast('⚠️ Ajoutez un article.', 'error'); return; }
    try {
        const vendeurDoc = await db.collection('vendeurs').doc(vendeurId).get();
        const vendeurNom = vendeurDoc.data().nom;
        for (const a of articles) {
            const existing = await db.collection('stock').where('vendeurId','==',vendeurId).where('nom','==',a.nom).get();
            if (existing.empty) { await db.collection('stock').add({ vendeurId, vendeurNom, nom: a.nom, quantite: a.quantite }); }
            else { const doc = existing.docs[0]; await db.collection('stock').doc(doc.id).update({ quantite: (doc.data().quantite||0) + a.quantite }); }
        }
        playSound('success');
        showToast(`✅ Stock ajouté pour ${vendeurNom} !`, 'success');
        closeStockModal();
        loadStockage();
    } catch(e) { console.error(e); showToast('❌ Erreur stockage.', 'error'); }
}

async function consulterStock() {
    playSound('click');
    document.getElementById('consulterStockModal').classList.add('active');
    await rafraichirStock();
}

function closeConsulterStockModal() {
    playSound('click');
    document.getElementById('consulterStockModal').classList.remove('active');
}

async function rafraichirStock() {
    try {
        const snapshot = await db.collection('stock').get();
        const container = document.getElementById('stockListContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucun stock.</p>'; return; }
        let html = '<div class="list-container">';
        const vendeurs = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!vendeurs[data.vendeurId]) vendeurs[data.vendeurId] = { nom: data.vendeurNom || 'Inconnu', articles: [] };
            vendeurs[data.vendeurId].articles.push({ id: doc.id, nom: data.nom, quantite: data.quantite || 0 });
        });
        for (const [vid, v] of Object.entries(vendeurs)) {
            html += `<div style="font-weight:700;padding:8px 0;border-top:1px solid #e2e8f0;">🏪 ${v.nom}</div>`;
            v.articles.forEach(a => {
                html += `<div class="list-item"><div><strong>${a.nom}</strong><br><small>${a.quantite} unités</small></div>
                    <div><button onclick="retirerStock('${a.id}')" class="btn-delete">➖ Retirer</button></div></div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

async function retirerStock(id) {
    const qty = prompt('Quantité à retirer :');
    if (!qty) return;
    const num = parseInt(qty);
    if (isNaN(num) || num <= 0) { showToast('⚠️ Quantité invalide.', 'error'); return; }
    try {
        const doc = await db.collection('stock').doc(id).get();
        const data = doc.data();
        const newQty = (data.quantite || 0) - num;
        if (newQty < 0) { showToast('⚠️ Stock insuffisant.', 'error'); return; }
        if (newQty === 0) { await db.collection('stock').doc(id).delete(); }
        else { await db.collection('stock').doc(id).update({ quantite: newQty }); }
        playSound('success');
        showToast('✅ Stock retiré !', 'success');
        await rafraichirStock();
        loadStockage();
    } catch(e) { console.error(e); showToast('❌ Erreur retrait.', 'error'); }
}

// ========== TRÉSORERIE ==========
async function loadTresorerie() {
    try {
        // Solde
        const soldeSnap = await db.collection('tresorerie').orderBy('date', 'desc').limit(1).get();
        let solde = 0;
        if (!soldeSnap.empty) { solde = soldeSnap.docs[0].data().solde || 0; }
        document.getElementById('soldeDisplay').textContent = formatNumber(solde) + ' FCFA';

        // Airtel
        const configSnap = await db.collection('tresorerie_config').doc('config').get();
        if (configSnap.exists) {
            document.getElementById('airtelDisplay').textContent = configSnap.data().airtel_numero || '+241 66 12 34 56';
        }

        // Transactions
        const snapshot = await db.collection('tresorerie').orderBy('date', 'desc').limit(50).get();
        const container = document.getElementById('transactionsContainer');
        if (snapshot.empty) { container.innerHTML = '<p class="empty-message">Aucune transaction.</p>'; } else {
            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const type = data.type || 'depot';
                const typeClass = type === 'depot' ? 'type-depot' : type === 'retrait' ? 'type-retrait' : 'type-airtel';
                const typeLabel = type === 'depot' ? '📥 Dépôt' : type === 'retrait' ? '📤 Retrait' : '🚚 Livraison';
                const montantClass = type === 'depot' ? 'montant-depot' : 'montant-retrait';
                const signe = type === 'depot' ? '+' : '-';
                const date = data.date ? new Date(data.date.seconds * 1000) : new Date();
                html += `<div class="transaction-item">
                    <div>
                        <span class="type ${typeClass}">${typeLabel}</span>
                        <span style="font-size:13px;color:#6b7a8f;margin-left:8px;">${date.toLocaleDateString()}</span>
                        ${data.description ? `<br><small style="color:#6b7a8f;">${data.description}</small>` : ''}
                        ${data.livreurNom ? `<br><small style="color:#8e44ad;">🚚 ${data.livreurNom}</small>` : ''}
                        ${data.mode && data.mode !== 'especes' ? `<br><small style="color:#6b7a8f;">${data.mode.replace('_', ' ').toUpperCase()}</small>` : ''}
                    </div>
                    <div class="${montantClass}">${signe} ${formatNumber(data.montant)} FCFA</div>
                </div>`;
            });
            container.innerHTML = html;
        }
        
        // ========== GAINS DES LIVREURS ==========
        await loadGainsLivreurs();
        
    } catch(e) { console.error('Erreur trésorerie:', e); }
}

// ========== GAINS DES LIVREURS ==========
async function loadGainsLivreurs() {
    try {
        const container = document.getElementById('gainsLivreursContainer');
        const snapshot = await db.collection('livreurs').orderBy('nom').get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">Aucun livreur.</p>';
            return;
        }
        
        let html = `<div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#f8f9fa;border-bottom:2px solid #e2e8f0;">
                        <th style="padding:8px 10px;text-align:left;">Livreur</th>
                        <th style="padding:8px 10px;text-align:center;">Type</th>
                        <th style="padding:8px 10px;text-align:right;">Total collecté</th>
                        <th style="padding:8px 10px;text-align:right;">Part livreur</th>
                        <th style="padding:8px 10px;text-align:right;">Part agent</th>
                        <th style="padding:8px 10px;text-align:center;">Taux livreur</th>
                    </tr>
                </thead>
                <tbody>`;
        
        let totalCollecteGlobal = 0;
        let totalPartLivreurGlobal = 0;
        let totalPartAgentGlobal = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const gains = data.gains || {};
            const totalCollecte = gains.total_collecte || 0;
            const partLivreur = gains.part_livreur || 0;
            const partAgent = gains.part_agent || 0;
            
            totalCollecteGlobal += totalCollecte;
            totalPartLivreurGlobal += partLivreur;
            totalPartAgentGlobal += partAgent;
            
            let typeLabel = '';
            let tauxLivreur = '0%';
            if (data.type === 'interne') {
                typeLabel = '🔒 Interne';
                tauxLivreur = '0%';
            } else if (data.contrat === 'garde_tout') {
                typeLabel = '💰 Garde tout';
                tauxLivreur = '100%';
            } else {
                typeLabel = '📊 Partage';
                tauxLivreur = totalCollecte > 0 ? Math.round((partLivreur / totalCollecte) * 100) + '%' : '0%';
            }
            
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 10px;"><strong>${data.nom}</strong></td>
                <td style="padding:8px 10px;text-align:center;">${typeLabel}</td>
                <td style="padding:8px 10px;text-align:right;">${formatNumber(totalCollecte)} FCFA</td>
                <td style="padding:8px 10px;text-align:right;color:#27ae60;font-weight:600;">${formatNumber(partLivreur)} FCFA</td>
                <td style="padding:8px 10px;text-align:right;color:#2980b9;">${formatNumber(partAgent)} FCFA</td>
                <td style="padding:8px 10px;text-align:center;font-weight:600;">${tauxLivreur}</td>
            </tr>`;
        }
        
        // Total général
        html += `
                </tbody>
                <tfoot>
                    <tr style="background:#f8f9fa;font-weight:700;border-top:2px solid #2c3e50;">
                        <td style="padding:10px;">📊 TOTAL</td>
                        <td style="text-align:center;">-</td>
                        <td style="text-align:right;">${formatNumber(totalCollecteGlobal)} FCFA</td>
                        <td style="text-align:right;color:#27ae60;">${formatNumber(totalPartLivreurGlobal)} FCFA</td>
                        <td style="text-align:right;color:#2980b9;">${formatNumber(totalPartAgentGlobal)} FCFA</td>
                        <td style="text-align:center;">${totalCollecteGlobal > 0 ? Math.round((totalPartLivreurGlobal / totalCollecteGlobal) * 100) + '%' : '0%'}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
        
        container.innerHTML = html;
    } catch(e) {
        console.error('Erreur gains livreurs:', e);
        document.getElementById('gainsLivreursContainer').innerHTML = '<p class="empty-message">❌ Erreur chargement des gains.</p>';
    }
}

function filtrerTransactions(type) {
    playSound('click');
    document.querySelectorAll('#sub-bilan-tresorerie .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === type));
    loadTresorerie();
}

function openDepotModal() {
    playSound('click');
    document.getElementById('depotModal').classList.add('active');
    document.getElementById('depotMontant').value = '';
    document.getElementById('depotDescription').value = '';
    document.getElementById('depotMode').value = 'especes';
}

function closeDepotModal() { document.getElementById('depotModal').classList.remove('active'); }

async function enregistrerDepot() {
    playSound('click');
    const montant = parseInt(document.getElementById('depotMontant').value);
    if (isNaN(montant) || montant <= 0) { showToast('⚠️ Montant invalide.', 'error'); return; }
    const mode = document.getElementById('depotMode').value;
    const description = document.getElementById('depotDescription').value.trim() || 'Dépôt';
    try {
        const soldeDoc = await db.collection('tresorerie').orderBy('date', 'desc').limit(1).get();
        let solde = 0;
        if (!soldeDoc.empty) { solde = soldeDoc.docs[0].data().solde || 0; }
        const nouveauSolde = solde + montant;
        await db.collection('tresorerie').add({
            type: 'depot',
            montant: montant,
            mode: mode,
            description: description,
            solde: nouveauSolde,
            date: new Date()
        });
        playSound('success');
        showToast(`✅ Dépôt de ${formatNumber(montant)} FCFA enregistré !`, 'success');
        closeDepotModal();
        loadTresorerie();
    } catch(e) { showToast('❌ Erreur dépôt.', 'error'); }
}

function openRetraitModal() {
    playSound('click');
    document.getElementById('retraitModal').classList.add('active');
    document.getElementById('retraitMontant').value = '';
    document.getElementById('retraitDescription').value = '';
    document.getElementById('retraitMode').value = 'especes';
}

function closeRetraitModal() { document.getElementById('retraitModal').classList.remove('active'); }

async function enregistrerRetrait() {
    playSound('click');
    const montant = parseInt(document.getElementById('retraitMontant').value);
    if (isNaN(montant) || montant <= 0) { showToast('⚠️ Montant invalide.', 'error'); return; }
    const mode = document.getElementById('retraitMode').value;
    const description = document.getElementById('retraitDescription').value.trim() || 'Retrait';
    try {
        const soldeDoc = await db.collection('tresorerie').orderBy('date', 'desc').limit(1).get();
        let solde = 0;
        if (!soldeDoc.empty) { solde = soldeDoc.docs[0].data().solde || 0; }
        if (solde < montant) { showToast('⚠️ Solde insuffisant.', 'error'); return; }
        const nouveauSolde = solde - montant;
        await db.collection('tresorerie').add({
            type: 'retrait',
            montant: montant,
            mode: mode,
            description: description,
            solde: nouveauSolde,
            date: new Date()
        });
        playSound('success');
        showToast(`✅ Retrait de ${formatNumber(montant)} FCFA enregistré !`, 'success');
        closeRetraitModal();
        loadTresorerie();
    } catch(e) { showToast('❌ Erreur retrait.', 'error'); }
}

function ouvrirAirtel() {
    playSound('click');
    const numero = document.getElementById('airtelDisplay').textContent.trim();
    if (numero) {
        const phone = numero.replace(/[^0-9+]/g, '');
        navigator.clipboard.writeText(phone).then(() => {
            showToast(`✅ Numéro ${numero} copié !`, 'success');
        });
    } else {
        showToast('⚠️ Numéro Airtel non configuré.', 'error');
    }
}

function exporterTransactions() {
    playSound('click');
    showToast('📊 Export bientôt disponible.', 'info');
}

// ========== UTILITAIRES ==========
function generateCodeSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i=0; i<8; i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
    return code;
}

async function generateUniqueCode() {
    let code = generateCodeSecret();
    let unique = false;
    let attempts=0;
    while(!unique && attempts<50) {
        const s = await db.collection('users').where('code_secret','==',code).get();
        if(s.empty) unique=true;
        else { code=generateCodeSecret(); attempts++; }
    }
    return code;
}

// ========== VENDEURS BILAN ==========
async function loadVendeursForBilan() {
    try {
        const s = await db.collection('commandes').get();
        const vendeurs = new Set();
        s.forEach(d => { const data=d.data(); if(data.vendeur) vendeurs.add(data.vendeur); });
        const select = document.getElementById('bilanVendeurSelect');
        select.innerHTML = '<option value="all">Tous les vendeurs</option>';
        vendeurs.forEach(v => { const opt=document.createElement('option'); opt.value=v; opt.textContent=v; select.appendChild(opt); });
    } catch(e) { console.error(e); }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = sessionStorage.getItem('user');
    if (!user) { window.location.href = 'index.html'; return; }
    try {
        const u = JSON.parse(user);
        document.getElementById('adminName').textContent = u.nom || 'Admin';
        if (u.role !== 'admin') { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }
    
    showSection('commandes');
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });
});