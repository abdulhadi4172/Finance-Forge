document.addEventListener('DOMContentLoaded', () => {
    // --- Global State & Selectors ---
    let currentUser = null; // Store logged-in user object
    let currentConversionData = null; // To store data for saving
    let currentQuoteData = null; // To store data for saving

    const sections = {
        home: document.getElementById('home-section'),
        login: document.getElementById('login-section'),
        register: document.getElementById('register-section'),
        converter: document.getElementById('converter-section'),
        quotes: document.getElementById('quotes-section'),
        dashboard: document.getElementById('dashboard-section'),
    };

    const navLinks = {
        home: document.getElementById('nav-home'),
        converter: document.getElementById('nav-converter'),
        quotes: document.getElementById('nav-quotes'),
        dashboard: document.getElementById('nav-dashboard'),
        login: document.getElementById('nav-login'),
        register: document.getElementById('nav-register'),
        logout: document.getElementById('nav-logout'),
    };

    // Form selectors
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const currencyConverterForm = document.getElementById('currency-converter-form');
    const investmentQuoteForm = document.getElementById('investment-quote-form');

    // Currency related selectors
    const fromCurrencySelect = document.getElementById('from-currency');
    const toCurrencySelect = document.getElementById('to-currency');
    const conversionResultDiv = document.getElementById('conversion-result');
    const saveConversionButton = document.getElementById('save-conversion');

    // Quote related selectors
    const quoteResultDiv = document.getElementById('quote-result');
    const saveQuoteButton = document.getElementById('save-quote');

    // Dashboard selectors
    const dashNameSpan = document.getElementById('dash-name');
    const dashEmailSpan = document.getElementById('dash-email');
    const conversionsListUl = document.getElementById('conversions-list');
    const quotesListUl = document.getElementById('quotes-list');
    const welcomeMessageP = document.getElementById('welcome-message');

    // API Key for ExchangeRate-API (Replace with your own free key if needed)
    // For this demo, we'll use a common public endpoint structure.
    // Some free APIs might not require a key for basic use but have rate limits.
    // The structure below is for ExchangeRate-API v4.
    // IMPORTANT: In a real app, API keys should NOT be in client-side code.
    const API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest/';

    const supportedCurrencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "BRL", "TRY"];


    // --- Navigation ---
    function showSection(sectionId) {
        Object.values(sections).forEach(section => section.classList.add('hidden'));
        Object.values(sections).forEach(section => section.classList.remove('active-section'));
        if (sections[sectionId]) {
            sections[sectionId].classList.remove('hidden');
            sections[sectionId].classList.add('active-section');
        }
    }

    navLinks.home.addEventListener('click', (e) => { e.preventDefault(); showSection('home'); });
    navLinks.converter.addEventListener('click', (e) => { e.preventDefault(); showSection('converter'); });
    navLinks.quotes.addEventListener('click', (e) => { e.preventDefault(); showSection('quotes'); });
    navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); if(currentUser) showSection('dashboard'); loadDashboard(); });
    navLinks.login.addEventListener('click', (e) => { e.preventDefault(); showSection('login'); });
    navLinks.register.addEventListener('click', (e) => { e.preventDefault(); showSection('register'); });
    navLinks.logout.addEventListener('click', (e) => { e.preventDefault(); logout(); });


    // --- Authentication (Simulated with localStorage) ---
    function getUsers() {
        return JSON.parse(localStorage.getItem('financeForgeUsers')) || [];
    }

    function saveUsers(users) {
        localStorage.setItem('financeForgeUsers', JSON.stringify(users));
    }

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value; // In real app, hash this!
        const registerError = document.getElementById('register-error');
        const registerSuccess = document.getElementById('register-success');

        registerError.textContent = '';
        registerSuccess.textContent = '';

        let users = getUsers();
        if (users.find(user => user.email === email)) {
            registerError.textContent = 'User with this email already exists.';
            return;
        }

        users.push({ name, email, password, conversions: [], quotes: [] }); // Store plain password - BAD PRACTICE!
        saveUsers(users);
        registerSuccess.textContent = 'Registration successful! Please login.';
        registerForm.reset();
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';

        let users = getUsers();
        const user = users.find(u => u.email === email && u.password === password); // Plain text compare - BAD!

        if (user) {
            currentUser = user;
            localStorage.setItem('financeForgeCurrentUser', JSON.stringify(currentUser));
            updateAuthUI();
            showSection('home');
            loginForm.reset();
        } else {
            loginError.textContent = 'Invalid email or password.';
        }
    });

    function logout() {
        currentUser = null;
        localStorage.removeItem('financeForgeCurrentUser');
        updateAuthUI();
        showSection('home');
        welcomeMessageP.textContent = '';
        saveConversionButton.classList.add('hidden');
        saveQuoteButton.classList.add('hidden');
    }

    function updateAuthUI() {
        if (currentUser) {
            navLinks.login.classList.add('hidden');
            navLinks.register.classList.add('hidden');
            navLinks.logout.classList.remove('hidden');
            navLinks.dashboard.classList.remove('hidden');
            welcomeMessageP.textContent = `Welcome back, ${currentUser.name}!`;
        } else {
            navLinks.login.classList.remove('hidden');
            navLinks.register.classList.remove('hidden');
            navLinks.logout.classList.add('hidden');
            navLinks.dashboard.classList.add('hidden');
            welcomeMessageP.textContent = '';
        }
    }

    function checkLoginState() {
        const user = localStorage.getItem('financeForgeCurrentUser');
        if (user) {
            currentUser = JSON.parse(user);
            updateAuthUI();
        }
    }

    // --- Currency Converter ---
    function populateCurrencySelects() {
        supportedCurrencies.forEach(currency => {
            const option1 = document.createElement('option');
            option1.value = currency;
            option1.textContent = currency;
            fromCurrencySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = currency;
            option2.textContent = currency;
            toCurrencySelect.appendChild(option2);
        });
        // Set default different values
        if (supportedCurrencies.length > 1) {
            fromCurrencySelect.value = supportedCurrencies[0]; // e.g., USD
            toCurrencySelect.value = supportedCurrencies[1];   // e.g., EUR
        }
    }

    currencyConverterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const from = fromCurrencySelect.value;
        const to = toCurrencySelect.value;

        if (isNaN(amount) || amount <= 0) {
            conversionResultDiv.textContent = 'Please enter a valid amount.';
            conversionResultDiv.style.color = 'red';
            saveConversionButton.classList.add('hidden');
            return;
        }

        conversionResultDiv.textContent = 'Converting...';
        conversionResultDiv.style.color = 'inherit';

        try {
            // Fetch rates for the 'from' currency
            const response = await fetch(`${API_BASE_URL}${from}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.result === 'error') {
                 throw new Error(data['error-type'] || 'API error');
            }

            const rate = data.rates[to];
            if (!rate) {
                throw new Error(`Rate not available for ${to} from ${from}`);
            }

            const convertedAmount = (amount * rate).toFixed(2);
            conversionResultDiv.textContent = `${amount} ${from} = ${convertedAmount} ${to}`;
            currentConversionData = { from, to, amount, convertedAmount, rate, date: new Date().toLocaleString() };
            
            if (currentUser) {
                saveConversionButton.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Currency conversion error:', error);
            conversionResultDiv.textContent = `Error: ${error.message}. Could not fetch exchange rate. Try again later.`;
            conversionResultDiv.style.color = 'red';
            saveConversionButton.classList.add('hidden');
        }
    });
    
    saveConversionButton.addEventListener('click', () => {
        if (currentUser && currentConversionData) {
            let users = getUsers();
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex !== -1) {
                users[userIndex].conversions.unshift(currentConversionData); // Add to beginning
                if(users[userIndex].conversions.length > 10) { // Keep last 10
                    users[userIndex].conversions.pop();
                }
                saveUsers(users);
                currentUser.conversions = users[userIndex].conversions; // Update current user object
                localStorage.setItem('financeForgeCurrentUser', JSON.stringify(currentUser));
                alert('Conversion saved to your dashboard!');
            }
        }
    });


    // --- Investment Quotes (Simplified) ---
    investmentQuoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const principal = parseFloat(document.getElementById('principal').value);
        const rate = parseFloat(document.getElementById('rate').value) / 100; // Convert percentage to decimal
        const years = parseInt(document.getElementById('years').value);

        if (isNaN(principal) || principal <= 0 || isNaN(rate) || rate <=0 || isNaN(years) || years <= 0) {
            quoteResultDiv.textContent = 'Please enter valid positive values for all fields.';
            quoteResultDiv.style.color = 'red';
            saveQuoteButton.classList.add('hidden');
            return;
        }

        // Simple compound interest formula: A = P(1 + r/n)^(nt)
        // For simplicity, n (compounding periods per year) = 1
        const futureValue = principal * Math.pow((1 + rate), years);
        const totalInterest = futureValue - principal;

        quoteResultDiv.innerHTML = `
            <p>Initial Principal: $${principal.toFixed(2)}</p>
            <p>Annual Interest Rate: ${(rate * 100).toFixed(1)}%</p>
            <p>Investment Term: ${years} Year(s)</p>
            <p><strong>Estimated Future Value: $${futureValue.toFixed(2)}</strong></p>
            <p><strong>Total Interest Earned: $${totalInterest.toFixed(2)}</strong></p>
        `;
        quoteResultDiv.style.color = 'inherit';
        currentQuoteData = { principal, rate: (rate*100), years, futureValue, totalInterest, date: new Date().toLocaleString() };
        
        if(currentUser) {
            saveQuoteButton.classList.remove('hidden');
        }
    });

    saveQuoteButton.addEventListener('click', () => {
        if (currentUser && currentQuoteData) {
            let users = getUsers();
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex !== -1) {
                users[userIndex].quotes.unshift(currentQuoteData);
                 if(users[userIndex].quotes.length > 10) { // Keep last 10
                    users[userIndex].quotes.pop();
                }
                saveUsers(users);
                currentUser.quotes = users[userIndex].quotes; // Update current user object
                localStorage.setItem('financeForgeCurrentUser', JSON.stringify(currentUser));
                alert('Quote saved to your dashboard!');
            }
        }
    });

    // --- Dashboard ---
    function loadDashboard() {
        if (!currentUser) {
            showSection('login'); // Redirect to login if not logged in
            return;
        }
        dashNameSpan.textContent = currentUser.name;
        dashEmailSpan.textContent = currentUser.email;

        // Load saved conversions
        conversionsListUl.innerHTML = ''; // Clear previous
        if (currentUser.conversions && currentUser.conversions.length > 0) {
            currentUser.conversions.forEach(conv => {
                const li = document.createElement('li');
                li.textContent = `${conv.date}: ${conv.amount} ${conv.from} = ${conv.convertedAmount} ${conv.to} (Rate: ${conv.rate.toFixed(4)})`;
                conversionsListUl.appendChild(li);
            });
        } else {
            conversionsListUl.innerHTML = '<li>No saved conversions yet.</li>';
        }

        // Load saved quotes
        quotesListUl.innerHTML = ''; // Clear previous
        if (currentUser.quotes && currentUser.quotes.length > 0) {
            currentUser.quotes.forEach(q => {
                const li = document.createElement('li');
                li.textContent = `${q.date}: Invest $${q.principal.toFixed(2)} at ${q.rate.toFixed(1)}% for ${q.years} year(s). Future Value: $${q.futureValue.toFixed(2)}`;
                quotesListUl.appendChild(li);
            });
        } else {
            quotesListUl.innerHTML = '<li>No saved quotes yet.</li>';
        }
    }

    // --- Initialization ---
    checkLoginState(); // Check if user was already logged in
    populateCurrencySelects(); // Populate currency dropdowns
    showSection('home'); // Show home section by default

});