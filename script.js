<script>
  function getChartTextColor() {
    return isDarkMode ? '#f3f4f6' : '#374151'; // Putih abu-abu jika dark, abu-abu gelap jika light
}

    // Config object for Element SDK
    const defaultConfig = {
      website_title: "BIODATA SISWA SEKOLAH DASAR",
      footer_text: "© 2024 Sekolah Dasar. Semua hak dilindungi.",
      header_color: "#2563eb",
      background_color: "#f3f4f6", //warna latar belakang background
      surface_color: "#ffffff",
      text_color: "#1f2937",
      primary_action_color: "#3b82f6"
    };

    // Global state
    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10;
    let chartKelas = null;
    let chartGender = null;
    let isDarkMode = false;
    let sortColumn = null; // Tambahkan ini
    let sortDirection = 'asc'; // Tambahkan ini (asc atau desc)

    // CSV URL
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8EbUUCJAxWs6PwfjKKB8pCFURgglFZxkYL80vj6PL_ZlZCNAOa8S-8Pn0BaWSCDixNhcjwy-a29XH/pub?gid=0&single=true&output=csv';

    // Parse CSV with proper handling for quoted fields
    function parseCSV(csv) {
      const lines = [];
      let currentLine = '';
      let insideQuotes = false;
      
      // Split CSV properly handling quotes
      for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        }
        
        if (char === '\n' && !insideQuotes) {
          if (currentLine.trim()) {
            lines.push(currentLine);
          }
          currentLine = '';
        } else {
          currentLine += char;
        }
      }
      
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      
      if (lines.length === 0) return [];
      
      // Parse header
      const headers = parseCSVLine(lines[0]);
      const data = [];
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }
      
      return data;
    }
    
    // Parse single CSV line handling quotes
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let insideQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    }

    // Load data from Google Sheets
    async function loadData() {
      try {
        const response = await fetch(CSV_URL);
        const csv = await response.text();
        allData = parseCSV(csv);
        filteredData = [...allData];
        
        populateFilters();
        renderTable();
        updateTotalData();
        renderCharts();
      } catch (error) {
        document.getElementById('table-body').innerHTML = `
          <tr>
            <td colspan="10" class="text-center py-8 text-red-500">
              Gagal memuat data. Silakan coba lagi.
            </td>
          </tr>
        `;
      }
    }

    // Populate filter dropdowns
    function populateFilters() {
      const kelasSet = new Set();
      
      allData.forEach(row => {
        if (row.Kelas) kelasSet.add(row.Kelas);
      });
      
      const kelasOptions = Array.from(kelasSet).sort().map(kelas => 
        `<option value="${kelas}">${kelas}</option>`
      ).join('');
      
      document.getElementById('filter-kelas').innerHTML = '<option value="">Semua Kelas</option>' + kelasOptions;
      document.getElementById('filter-kelas-chart').innerHTML = '<option value="">Semua Kelas</option>' + kelasOptions;
      
      // Populate nama filter based on current kelas selection
      populateNamaFilter();
    }
    
    // Populate nama filter based on selected kelas
    function populateNamaFilter() {
      const kelasFilter = document.getElementById('filter-kelas').value;
      const namaSet = new Set();
      
      // Filter data based on selected kelas
      const dataForNama = kelasFilter ? 
        allData.filter(row => row.Kelas === kelasFilter) : 
        allData;
      
      dataForNama.forEach(row => {
        if (row.Nama) namaSet.add(row.Nama);
      });
      
      const namaOptions = Array.from(namaSet).sort().map(nama => 
        `<option value="${nama}">${nama}</option>`
      ).join('');
      
      const currentNamaValue = document.getElementById('filter-nama').value;
      document.getElementById('filter-nama').innerHTML = '<option value="">Semua Nama</option>' + namaOptions;
      
      // Check if previously selected nama still exists in new filter
      const stillExists = Array.from(namaSet).includes(currentNamaValue);
      if (stillExists) {
        document.getElementById('filter-nama').value = currentNamaValue;
      }
    }

    // Apply filters
    function applyFilters() {
      const kelasFilter = document.getElementById('filter-kelas').value;
      const namaFilter = document.getElementById('filter-nama').value;
      const searchQuery = document.getElementById('search-input').value.toLowerCase();
      
      filteredData = allData.filter(row => {
        const matchKelas = !kelasFilter || row.Kelas === kelasFilter;
        const matchNama = !namaFilter || row.Nama === namaFilter;
        const matchSearch = !searchQuery || 
          Object.values(row).some(val => 
            val.toString().toLowerCase().includes(searchQuery)
          );
        return matchKelas && matchNama && matchSearch;
      });
      
      currentPage = 1;
      renderTable();
      updateTotalData();
    }

            function sortTable(column) {
    // Jika klik kolom yang sama, balikkan arahnya. Jika kolom berbeda, mulai dari 'asc'
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredData.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        // Penanganan khusus untuk angka (seperti NISN atau No)
        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    currentPage = 1; // Reset ke halaman pertama setelah sort
    renderTable();
}

    // Render table
    function renderTable() {
      const tbody = document.getElementById('table-body');
      const start = rowsPerPage === 'all' ? 0 : (currentPage - 1) * parseInt(rowsPerPage);
      const end = rowsPerPage === 'all' ? filteredData.length : start + parseInt(rowsPerPage);
      const pageData = filteredData.slice(start, end);
      
      if (pageData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="text-center py-8 text-gray-500">
              Tidak ada data yang ditemukan
            </td>
          </tr>
        `;
        renderPagination();
        return;
      }
      
      tbody.innerHTML = pageData.map((row, index) => `
        <tr class="table-row border-b border-gray-200">
          <td class="text-gray-700 text-center">${start + index + 1}</td>
          <td class="text-gray-700 font-medium" >${row.Nama || '-'}</td>
		  <td class="text-gray-700">${row['NIK'] || '-'}</td>
          <td class="text-gray-700">${row['Tempat Lahir'] || '-'}</td>
          <td class="text-gray-700">${row['Tanggal Lahir'] || '-'}</td>
          <td class="text-gray-700">${row.Kelas || '-'}</td>
          <td class="text-gray-700">${row.NISN || '-'}</td>
          <td class="text-gray-700">${row.NIS || '-'}</td>
          <td class="text-gray-700">${row.Alamat || '-'}</td>
          <td class="text-gray-700">${row['Nama Ayah'] || '-'}</td>
          <td class="text-gray-700">${row['Nama Ibu'] || '-'}</td>
          <td class="text-gray-700">${row['Jenis Kelamin'] || '-'}</td>
        </tr>
      `).join('');
      
      renderPagination();
    }

    // Render pagination
    function renderPagination() {
      const pagination = document.getElementById('pagination');
      
      if (rowsPerPage === 'all') {
        pagination.innerHTML = '';
        return;
      }
      
      const totalPages = Math.ceil(filteredData.length / parseInt(rowsPerPage));
      
      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }
      
      let buttons = [];
      
      // Previous button
      buttons.push(`
        <button onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''} 
                class="pagination-btn px-4 py-2 rounded-lg font-medium ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
          ← Prev
        </button>
      `);
      
      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
          buttons.push(`
            <button onclick="changePage(${i})" 
                    class="pagination-btn px-4 py-2 rounded-lg font-medium ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
              ${i}
            </button>
          `);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
          buttons.push('<span class="px-2 text-gray-500">...</span>');
        }
      }
      
      // Next button
      buttons.push(`
        <button onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                class="pagination-btn px-4 py-2 rounded-lg font-medium ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
          Next →
        </button>
      `);
      
      pagination.innerHTML = buttons.join('');
    }

    // Change page
    function changePage(page) {
      const totalPages = Math.ceil(filteredData.length / parseInt(rowsPerPage));
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
      }
    }

    // Update total data display
    function updateTotalData() {
      document.getElementById('total-data').textContent = `Total: ${filteredData.length} siswa`;
    }

    // Render charts
    function renderCharts() {
      const kelasFilter = document.getElementById('filter-kelas-chart').value;
      const dataToAnalyze = kelasFilter ? 
        allData.filter(row => row.Kelas === kelasFilter) : 
        allData;
      
      // Count by Kelas
      const kelasCounts = {};
      dataToAnalyze.forEach(row => {
        const kelas = row.Kelas || 'Tidak Diketahui';
        kelasCounts[kelas] = (kelasCounts[kelas] || 0) + 1;
      });
      
      // Count by Gender (assuming there's a Jenis Kelamin column)
      const genderCounts = { 'Laki-laki': 0, 'Perempuan': 0 };
      dataToAnalyze.forEach(row => {
        const gender = row['Jenis Kelamin'] || row['L/P'] || '';
        if (gender.toLowerCase().includes('l') || gender.toLowerCase().includes('laki')) {
          genderCounts['Laki-laki']++;
        } else if (gender.toLowerCase().includes('p') || gender.toLowerCase().includes('perempuan')) {
          genderCounts['Perempuan']++;
        }
      });
      
      // Chart Kelas
      const ctxKelas = document.getElementById('chart-kelas').getContext('2d');
      if (chartKelas) chartKelas.destroy();
      
      chartKelas = new Chart(ctxKelas, {
        type: 'bar',
        data: {
          labels: Object.keys(kelasCounts),
          datasets: [{
            label: 'Jumlah Siswa',
            data: Object.values(kelasCounts),
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              beginAtZero: true,
              ticks: { 
               color: isDarkMode ? '#f3f4f6' : '#374151', // Warna angka di bawah diagram
               stepSize: 1 }, 
               grid: { color: isDarkMode ? '#4b5563' : '#e5e7eb' } // Warna garis grid,
               },
			   y: { // <--- INI BAGIAN UNTUK KELAS 1 - KELAS 6
                ticks: { 
                    color: isDarkMode ? '#f3f4f6' : '#374151', // Warna font Label Kelas
                    font: {
                        size: 12,
                        weight: '500'
                    }
                },
                grid: { display: false }
            }
			   
          }
        }
      });
      
      // Chart Gender
      const ctxGender = document.getElementById('chart-gender').getContext('2d');
      if (chartGender) chartGender.destroy();
      
      chartGender = new Chart(ctxGender, {
        type: 'doughnut',
        data: {
          labels: Object.keys(genderCounts),
          datasets: [{
            label: 'Jumlah Siswa',
            data: Object.values(genderCounts),
            backgroundColor: ['#3b82f6', '#ec4899'],
            borderWidth: 0,
            borderColor: '#ffffff',
			hoverBorderWidth: 0,        // Border akan menebal jadi 6px saat di-hover
            hoverBorderColor: isDarkMode ? '#f3f4f6' : '#1e3a8a', // Opsional: ganti warna border saat di-hover
            
            hoverOffset: 10             // Potongan diagram akan sedikit "keluar" saat di-hover
            // -------------------------
			
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true,
              position: 'bottom',
              labels: {
			  // INI KUNCINYA: Mengatur warna teks Laki-laki & Perempuan
              color: isDarkMode ? '#f3f4f6' : '#374151', // Warna teks legenda Laki-laki/Perempuan
			  font: {
					size: 14
					},
					padding: 20
					}

              
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + value + ' (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
      
      // Update total with gender breakdown
      const primaryColor = window.elementSdk?.config?.primary_action_color || defaultConfig.primary_action_color;
      
      document.getElementById('total-chart').innerHTML = `
        <p class="text-5xl font-bold" style="color: ${primaryColor}">${dataToAnalyze.length}</p>
        <p class="text-gray-600 mt-2">Total Siswa</p>
      `;
      
      document.getElementById('total-laki').innerHTML = `
        <p class="text-5xl font-bold text-blue-500">${genderCounts['Laki-laki']}</p>
        <p class="text-gray-600 mt-2">Laki-laki</p>
      `;
      
      document.getElementById('total-perempuan').innerHTML = `
        <p class="text-5xl font-bold text-pink-500">${genderCounts['Perempuan']}</p>
        <p class="text-gray-600 mt-2">Perempuan</p>
      `;
    }

    // Tab switching
    function switchTab(tabName) {
      const primaryColor = window.elementSdk?.config?.primary_action_color || defaultConfig.primary_action_color;
      
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#6b7280';
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      const activeTab = document.getElementById(`tab-${tabName}`);
      activeTab.classList.add('active');
      activeTab.style.backgroundColor = primaryColor;
      activeTab.style.color = 'white';
      
      document.getElementById(`content-${tabName}`).classList.remove('hidden');
      
      if (tabName === 'infografis') {
        renderCharts();
      }
    }
    
    // Toggle dark mode
    function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  const appContainer = document.getElementById('app-container');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  if (isDarkMode) {
    appContainer.classList.add('dark-mode-active');
    
  } else {
    appContainer.classList.remove('dark-mode-active');
    
  }
  // PENTING: Gambar ulang grafik agar warna font-nya berubah
    if (chartKelas || chartGender) {
        renderCharts();
}
}

    // Event listeners
    document.getElementById('tab-biodata').addEventListener('click', () => switchTab('biodata'));
    document.getElementById('tab-infografis').addEventListener('click', () => switchTab('infografis'));
    document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);

    document.getElementById('filter-kelas').addEventListener('change', () => {
      populateNamaFilter();
      applyFilters();
    });
    document.getElementById('filter-nama').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
    
    document.getElementById('reset-btn').addEventListener('click', () => {
      document.getElementById('filter-kelas').value = '';
      document.getElementById('filter-nama').value = '';
      document.getElementById('search-input').value = '';
      populateNamaFilter();
      applyFilters();
    });
    
    document.getElementById('rows-per-page').addEventListener('change', (e) => {
      rowsPerPage = e.target.value;
      currentPage = 1;
      renderTable();
    });
    
    document.getElementById('filter-kelas-chart').addEventListener('change', renderCharts);
    document.getElementById('reset-chart-btn').addEventListener('click', () => {
      document.getElementById('filter-kelas-chart').value = '';
      renderCharts();
    });

    // Apply config changes
    async function onConfigChange(config) {
      const titleElement = document.getElementById('header-title');
      const footerElement = document.getElementById('footer-text');
      const headerElement = document.getElementById('header');
      const appContainer = document.getElementById('app-container');
      const tableHeader = document.getElementById('table-header');
      const tabButtons = document.querySelectorAll('.tab-button');
      const primaryColor = config.primary_action_color || defaultConfig.primary_action_color;
      
      titleElement.textContent = config.website_title || defaultConfig.website_title;
      footerElement.textContent = config.footer_text || defaultConfig.footer_text;
      
      headerElement.style.backgroundColor = config.header_color || defaultConfig.header_color;
      appContainer.style.backgroundColor = config.background_color || defaultConfig.background_color;
      tableHeader.style.backgroundColor = config.header_color || defaultConfig.header_color;
      
      tabButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
          btn.style.backgroundColor = primaryColor;
          btn.style.color = 'white';
        } else {
          btn.style.backgroundColor = 'transparent';
          btn.style.color = '#6b7280';
        }
      });
    }
    
    // Apply initial styles on page load
    function applyInitialStyles() {
      const headerElement = document.getElementById('header');
      const appContainer = document.getElementById('app-container');
      const tableHeader = document.getElementById('table-header');
      const tabButtons = document.querySelectorAll('.tab-button');
      
      headerElement.style.backgroundColor = defaultConfig.header_color;
      appContainer.style.backgroundColor = defaultConfig.background_color;
      tableHeader.style.backgroundColor = defaultConfig.header_color;
      
      tabButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
          btn.style.backgroundColor = defaultConfig.primary_action_color;
          btn.style.color = 'white';
        } else {
          btn.style.backgroundColor = 'transparent';
          btn.style.color = '#6b7280';
        }
      });
    }

    // Element SDK integration
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities: (config) => ({
          recolorables: [
            {
              get: () => config.header_color || defaultConfig.header_color,
              set: (value) => {
                config.header_color = value;
                window.elementSdk.setConfig({ header_color: value });
              }
            },
            {
              get: () => config.background_color || defaultConfig.background_color,
              set: (value) => {
                config.background_color = value;
                window.elementSdk.setConfig({ background_color: value });
              }
            },
            {
              get: () => config.text_color || defaultConfig.text_color,
              set: (value) => {
                config.text_color = value;
                window.elementSdk.setConfig({ text_color: value });
              }
            },
            {
              get: () => config.primary_action_color || defaultConfig.primary_action_color,
              set: (value) => {
                config.primary_action_color = value;
                window.elementSdk.setConfig({ primary_action_color: value });
              }
            }
          ],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map([
          ["website_title", config.website_title || defaultConfig.website_title],
          ["footer_text", config.footer_text || defaultConfig.footer_text]
        ])
      });
    }

    // Initialize
    applyInitialStyles();
    loadData();
  </script>
 <script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9b3e68e862b8e9d5',t:'MTc2NjcyOTM3MS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>
