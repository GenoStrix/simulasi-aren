let myChart = null;
let globalLogData = []; // Variabel baru untuk menyimpan data yang siap didownload

document.getElementById("simForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const interarrival = parseFloat(
    document.getElementById("interarrival").value,
  );
  const service = parseFloat(document.getElementById("service").value);
  const maks_tungku = parseInt(document.getElementById("maks_tungku").value);
  const btn = document.getElementById("btn-submit");
  const btnDownload = document.getElementById("btn-download");

  btn.innerText = "Sedang Menghitung...";
  btn.disabled = true;
  btnDownload.style.display = "none"; // Sembunyikan tombol download saat menghitung

  try {
    const response = await fetch("http://127.0.0.1:8000/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waktu_antar_kedatangan: interarrival,
        waktu_pelayanan: service,
        maks_tungku: maks_tungku,
      }),
    });

    const result = await response.json();

    if (result.status === "success") {
      gambarGrafik(result.data);
      buatKesimpulan(result.data);

      // Simpan data log dan munculkan tombol download
      if (result.data[0] && result.data[0].log_petani) {
        globalLogData = result.data[0].log_petani;
        btnDownload.style.display = "inline-block";
      }
    }
  } catch (error) {
    alert("Gagal menghubungi server. Pastikan Backend FastAPI sudah menyala!");
    console.error(error);
  } finally {
    btn.innerText = "Mulai Simulasi";
    btn.disabled = false;
  }
});

// EVENT LISTENER BARU UNTUK TOMBOL DOWNLOAD
document.getElementById("btn-download").addEventListener("click", () => {
  if (globalLogData.length === 0) return;

  // Buat header CSV
  let csvContent =
    "ID Petani,Waktu Datang (Menit),Durasi Masak (Menit),Waktu Tunggu (Menit)\n";

  // Gabungkan data
  globalLogData.forEach((row) => {
    csvContent += `Petani-${row.id},${row.waktu_datang},${row.durasi_masak},${row.waktu_tunggu}\n`;
  });

  // Buat file dan paksa browser untuk mendownloadnya
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Dataset_Simulasi_Aren.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

function gambarGrafik(dataSimulasi) {
  const labels = [];
  const dataWq = [];
  const dataRho = [];

  dataSimulasi.forEach((item) => {
    labels.push(`c = ${item.tungku}`);
    dataWq.push(item.wq);
    dataRho.push(item.rho);
  });

  const ctx = document.getElementById("simChart").getContext("2d");

  if (myChart !== null) {
    myChart.destroy();
  }

  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "bar",
          label: "Utilisasi Tungku - ρ (%)",
          data: dataRho,
          backgroundColor: "rgba(52, 152, 219, 0.6)",
          borderColor: "rgba(52, 152, 219, 1)",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Waktu Tunggu - Wq (Menit)",
          data: dataWq,
          backgroundColor: "rgba(231, 76, 60, 1)",
          borderColor: "rgba(231, 76, 60, 1)",
          borderWidth: 3,
          marker: "circle",
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Utilisasi (%)" },
          max: 100,
          min: 0,
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Waktu Tunggu (Menit)" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function buatKesimpulan(dataSimulasi) {
  const divKesimpulan = document.getElementById("kesimpulan");
  let rekomendasi = "";
  let batasFermentasi = 60;

  const skenarioAman = dataSimulasi.filter(
    (item) => item.wq <= batasFermentasi,
  );

  if (skenarioAman.length > 0) {
    const optimal = skenarioAman[0];
    rekomendasi = `<strong>Keputusan Berbasis Data:</strong><br> Jumlah tungku optimal adalah <strong>${optimal.tungku} Tungku</strong>. 
        Pada titik ini, waktu tunggu nira adalah ${optimal.wq} menit (Aman dari fermentasi), 
        dan tingkat utilisasi tungku berada pada ${optimal.rho}%.`;
  } else {
    rekomendasi = `<strong style="color:red;">Peringatan Kritis:</strong><br> Semua skenario menyebabkan nira terfermentasi. Tambahkan lebih banyak tungku!`;
  }

  divKesimpulan.innerHTML = rekomendasi;

  if (dataSimulasi[0] && dataSimulasi[0].log_petani) {
    buatTabelData(dataSimulasi[0].log_petani);
  }
}

function buatTabelData(logData) {
  const tbody = document.getElementById("tabel-data");
  if (!tbody) return;

  tbody.innerHTML = "";

  logData.forEach((petani) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #eee";
    tr.innerHTML = `
            <td style="padding: 5px;">Petani-${petani.id}</td>
            <td style="padding: 5px;">${petani.waktu_datang}</td>
            <td style="padding: 5px;">${petani.durasi_masak}</td>
            <td style="padding: 5px;">${petani.waktu_tunggu}</td>
        `;
    tbody.appendChild(tr);
  });
}
