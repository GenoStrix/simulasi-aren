let myChart = null; // Menyimpan instance chart agar bisa di-reset

document.getElementById("simForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // Mencegah halaman reload

  // Ambil data dari form
  const interarrival = parseFloat(
    document.getElementById("interarrival").value,
  );
  const service = parseFloat(document.getElementById("service").value);
  const maks_tungku = parseInt(document.getElementById("maks_tungku").value);
  const btn = document.getElementById("btn-submit");

  // Ubah status tombol saat loading
  btn.innerText = "Sedang Menghitung...";
  btn.disabled = true;

  try {
    // Panggil API Backend FastAPI
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
    }
  } catch (error) {
    alert("Gagal menghubungi server. Pastikan Backend FastAPI sudah menyala!");
    console.error(error);
  } finally {
    // Kembalikan tombol seperti semula
    btn.innerText = "Mulai Simulasi";
    btn.disabled = false;
  }
});

function gambarGrafik(dataSimulasi) {
  // Siapkan array kosong untuk sumbu X dan Y
  const labels = [];
  const dataWq = [];
  const dataRho = [];

  // Pecah data JSON ke dalam array
  dataSimulasi.forEach((item) => {
    labels.push(`c = ${item.tungku}`);
    dataWq.push(item.wq);
    dataRho.push(item.rho);
  });

  const ctx = document.getElementById("simChart").getContext("2d");

  // Hapus grafik lama jika sudah ada (agar tidak tertumpuk)
  if (myChart !== null) {
    myChart.destroy();
  }

  // Buat Grafik baru menggunakan Chart.js
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
          grid: { drawOnChartArea: false }, // Agar garis grid tidak bertumpuk
        },
      },
    },
  });
}

function buatKesimpulan(dataSimulasi) {
  const divKesimpulan = document.getElementById("kesimpulan");
  let rekomendasi = "";
  let batasFermentasi = 60; // Anggap nira rusak jika antre lebih dari 60 menit

  // Mencari tungku paling optimal (Wq di bawah 60, Utilisasi paling tinggi di antara yang aman)
  const skenarioAman = dataSimulasi.filter(
    (item) => item.wq <= batasFermentasi,
  );

  if (skenarioAman.length > 0) {
    const optimal = skenarioAman[0]; // Ambil yang tungkunya paling sedikit tapi aman
    rekomendasi = `<strong>Keputusan Berbasis Data:</strong><br> Jumlah tungku optimal adalah <strong>${optimal.tungku} Tungku</strong>. 
        Pada titik ini, waktu tunggu nira adalah ${optimal.wq} menit (Aman dari fermentasi), 
        dan tingkat utilisasi tungku berada pada ${optimal.rho}%.`;
  } else {
    rekomendasi = `<strong style="color:red;">Peringatan Kritis:</strong><br> Semua skenario menyebabkan nira terfermentasi (waktu tunggu terlalu lama). Tambahkan lebih banyak tungku!`;
  }

  divKesimpulan.innerHTML = rekomendasi;
}
