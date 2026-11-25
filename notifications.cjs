const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp({
  projectId: 'mes-controles-techniques'
});

const db = getFirestore();
const messaging = getMessaging();

const UID_COLLECTIF = 'qMwMoKB9x8gn7k3lAmW1OpzklPI3';

function joursRestants(date) {
  const aujourdHui = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  return Math.round(
    (Date.parse(date) - Date.parse(aujourdHui)) / 86400000
  );
}

function dateFr(date) {
  return date.split('-').reverse().join('/');
}

async function envoyer(appareils, titre, texte, tag) {
  let erreurs = 0;

  for (const appareil of appareils) {
    try {
      await messaging.send({
        token: appareil.data().token,
        data: {
          title: titre,
          body: texte,
          tag: tag
        }
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        await appareil.ref.update({ actif: false });
      } else {
        erreurs++;
        console.error('Erreur envoi :', err.code);
      }
    }
  }

  if (erreurs > 0) {
    throw new Error('Certains envois ont echoue');
  }
}

async function main() {
  const inscriptions = await db.collection('notifications').get();

  const appareils = inscriptions.docs.filter(d =>
    d.data().actif === true &&
    d.data().uid === UID_COLLECTIF &&
    typeof d.data().token === 'string'
  );

  console.log('Appareils actifs :', appareils.length);

  if (appareils.length === 0) return;

  if (process.env.TEST_NOTIFICATION === 'true') {
    await envoyer(
      appareils,
      'Mes Controles Techniques',
      'Les notifications fonctionnent !',
      'test-notification'
    );
    console.log('Test termine');
    return;
  }

  const controles = await db.collection('controles_techniques').get();

  for (const document of controles.docs) {
    const vehicule = document.data();
    const nom = vehicule.name || 'Vehicule';
    const date = vehicule.date;
    const rdv = vehicule.rdvPris === true;

    if (typeof date !== 'string') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const jours = joursRestants(date);

    const reference = db.collection('suivi_notifications')
      .doc(document.id);

    const ancien = await reference.get();
    const suivi = ancien.data() || {};

    const memeDate = suivi.date === date;
    const rappels = memeDate
      ? (suivi.rappels || [])
      : [];

    if (
      rdv &&
      (!memeDate || suivi.rdvPris !== true)
    ) {
      await envoyer(
        appareils,
        'Rendez-vous pris pour ' + nom,
        'Le rendez-vous pour le contrôle technique a été pris. Échéance : ' + dateFr(date),
        'rdv-' + document.id
      );
      await reference.set({ date, rdvPris: true, rappels }, { merge: true });
    }

    const seuils = rdv
      ? [7, 0]
      : [60, 45, 30, 15, 7, 0];

    if (seuils.includes(jours) && !rappels.includes(jours)) {
      await envoyer(
        appareils,
        'Controle technique : ' + nom,
        jours === 0
          ? 'Controle technique a effectuer aujourd’hui !'
          : 'Echeance dans ' + jours + ' jours, le ' + dateFr(date),
        'rappel-' + document.id + '-' + jours
      );

      rappels.push(jours);
    }

    await reference.set({
      date: date,
      rdvPris: rdv,
      rappels: rappels
    });
  }

  console.log('Verification terminee');
}

main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
