/*
  app.js – front-end logic for the dog adoption assurance website

  This script uses the browser's localStorage to persist user accounts,
  session state and pet profiles. It provides functions to register
  subscribers, authenticate users, capture information about their pets
  (including veterinary certificates and photos) and list all pets
  available for adoption. Because there is no back‑end server in this
  simple demo, all data lives in the visitor's browser.
*/

// Utility functions to interact with localStorage
function getUsers() {
  const data = localStorage.getItem('users');
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing users from localStorage', e);
    return [];
  }
}

function setUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function getCurrentUserEmail() {
  return localStorage.getItem('currentUser');
}

function setCurrentUserEmail(email) {
  localStorage.setItem('currentUser', email);
}

function findUser(email) {
  const users = getUsers();
  return users.find(u => u.email === email);
}

// Sign up logic: create new user
function handleSignup(event) {
  event.preventDefault();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorEl = document.getElementById('signup-error');
  errorEl.textContent = '';
  if (!email || !password || !confirm) {
    errorEl.textContent = 'Veuillez remplir tous les champs.';
    return;
  }
  if (password !== confirm) {
    errorEl.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    errorEl.textContent = 'Un compte avec cet e‑mail existe déjà.';
    return;
  }
  const newUser = {
    email,
    password,
    fund: 4, // from the 6 € subscription, 4 € goes to the dog’s fund
    pet: null // will hold pet details later
  };
  users.push(newUser);
  setUsers(users);
  setCurrentUserEmail(email);
  // Redirect to dashboard directly after successful registration
  window.location.href = 'dashboard.html';
}

// Login logic
function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  const user = findUser(email);
  if (!user || user.password !== password) {
    errorEl.textContent = 'Identifiants invalides.';
    return;
  }
  setCurrentUserEmail(email);
  window.location.href = 'dashboard.html';
}

// Logout
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// Dashboard: load user data and populate fields
function loadDashboard() {
  const email = getCurrentUserEmail();
  if (!email) {
    // if not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  const user = findUser(email);
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  // Display fund amount
  const fundEl = document.getElementById('fund-value');
  if (fundEl) {
    fundEl.textContent = user.fund.toFixed(2) + ' €';
  }
  // Populate existing pet info if any
  if (user.pet) {
    displayPetInfo(user.pet);
  }
  // Attach form handler
  const petForm = document.getElementById('pet-form');
  if (petForm) {
    petForm.addEventListener('submit', function(ev) {
      ev.preventDefault();
      savePetInfo(user);
    });
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// Save pet information from the dashboard form
function savePetInfo(user) {
  const name = document.getElementById('pet-name').value.trim();
  const desc = document.getElementById('pet-desc').value.trim();
  const vetFileInput = document.getElementById('pet-vet');
  const photoInput = document.getElementById('pet-photos');
  const errorEl = document.getElementById('pet-error');
  if (errorEl) errorEl.textContent = '';
  if (!name || !desc) {
    if (errorEl) errorEl.textContent = 'Veuillez indiquer le nom et la description du chien.';
    return;
  }
  // Read files asynchronously and then save
  const readerTasks = [];
  // Vet certificate (single file)
  let vetObj = null;
  if (vetFileInput.files && vetFileInput.files.length > 0) {
    const file = vetFileInput.files[0];
    const vetPromise = new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = function() {
        vetObj = { name: file.name, data: fr.result };
        resolve();
      };
      fr.readAsDataURL(file);
    });
    readerTasks.push(vetPromise);
  }
  // Photos (multiple)
  const photos = [];
  if (photoInput.files && photoInput.files.length > 0) {
    Array.from(photoInput.files).forEach(file => {
      const p = new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = function() {
          photos.push({ name: file.name, data: fr.result });
          resolve();
        };
        fr.readAsDataURL(file);
      });
      readerTasks.push(p);
    });
  }
  Promise.all(readerTasks).then(() => {
    const users = getUsers();
    // Update this user
    const idx = users.findIndex(u => u.email === user.email);
    const petObj = {
      name,
      description: desc,
      vetFile: vetObj,
      photos
    };
    users[idx].pet = petObj;
    setUsers(users);
    displayPetInfo(petObj);
    // reset form inputs
    document.getElementById('pet-form').reset();
  });
}

// Display pet information on the dashboard
function displayPetInfo(pet) {
  const infoEl = document.getElementById('pet-info');
  if (!infoEl) return;
  // Clear existing
  infoEl.innerHTML = '';
  const heading = document.createElement('h3');
  heading.textContent = pet.name;
  infoEl.appendChild(heading);
  const descP = document.createElement('p');
  descP.textContent = pet.description;
  infoEl.appendChild(descP);
  // Vet file
  if (pet.vetFile) {
    const vetLink = document.createElement('a');
    vetLink.href = pet.vetFile.data;
    vetLink.download = pet.vetFile.name;
    vetLink.textContent = 'Télécharger le certificat vétérinaire';
    vetLink.style.display = 'block';
    vetLink.style.marginBottom = '0.5rem';
    infoEl.appendChild(vetLink);
  }
  // Photos
  if (pet.photos && pet.photos.length > 0) {
    const photosDiv = document.createElement('div');
    photosDiv.className = 'pet-photos';
    pet.photos.forEach(ph => {
      const img = document.createElement('img');
      img.src = ph.data;
      img.alt = ph.name;
      photosDiv.appendChild(img);
    });
    infoEl.appendChild(photosDiv);
  }
}

// Display all dogs for adoption on dogs.html
function loadDogsPage() {
  const container = document.getElementById('dogs-container');
  if (!container) return;
  const users = getUsers();
  let count = 0;
  users.forEach(user => {
    if (user.pet) {
      count++;
      const card = document.createElement('div');
      card.className = 'card';
      // use first photo or placeholder
      const img = document.createElement('img');
      if (user.pet.photos && user.pet.photos.length > 0) {
        img.src = user.pet.photos[0].data;
      } else {
        img.src = 'images/real2.jpg'; // fallback image: photo réelle d’un chien
      }
      img.alt = user.pet.name;
      card.appendChild(img);
      const cardContent = document.createElement('div');
      cardContent.className = 'card-content';
      const h3 = document.createElement('h3');
      h3.textContent = user.pet.name;
      cardContent.appendChild(h3);
      const p = document.createElement('p');
      p.textContent = user.pet.description;
      cardContent.appendChild(p);
      const fundSpan = document.createElement('p');
      fundSpan.className = 'fund';
      fundSpan.textContent = 'Cagnotte: ' + (user.fund.toFixed(2)) + ' €';
      cardContent.appendChild(fundSpan);
      card.appendChild(cardContent);
      container.appendChild(card);
    }
  });
  // Show message if no dogs
  const messageEl = document.getElementById('no-dogs-message');
  if (messageEl) {
    if (count === 0) {
      messageEl.style.display = 'block';
    } else {
      messageEl.style.display = 'none';
    }
  }
}

// Attach event listeners based on page
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  // Dashboard page detection
  if (document.getElementById('dashboard-page')) {
    loadDashboard();
  }
  // Dogs page detection
  if (document.getElementById('dogs-page')) {
    loadDogsPage();
  }
});