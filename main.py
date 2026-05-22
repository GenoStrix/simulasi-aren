from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import simpy
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class InputSimulasi(BaseModel):
    waktu_antar_kedatangan: float
    waktu_pelayanan: float
    maks_tungku: int

def jalankan_simpy(interarrival, service, c, sim_time=4800):
    wait_times = []
    server_busy_time = 0
    log_petani = [] # List untuk menyimpan data riwayat persis seperti di Excel

    def petani(env, tungku, id_petani):
        nonlocal server_busy_time
        waktu_datang = env.now
        
        with tungku.request() as req:
            yield req
            waktu_tunggu = env.now - waktu_datang
            wait_times.append(waktu_tunggu)
            
            mulai_masak = env.now
            durasi_masak = random.expovariate(1.0 / service)
            
            # Menyimpan 30 data pertama untuk ditampilkan di web
            if len(log_petani) < 30:
                log_petani.append({
                    "id": id_petani,
                    "waktu_datang": round(waktu_datang, 2),
                    "durasi_masak": round(durasi_masak, 2),
                    "waktu_tunggu": round(waktu_tunggu, 2)
                })
                
            yield env.timeout(durasi_masak)
            server_busy_time += (env.now - mulai_masak)

    def setup(env):
        tungku = simpy.Resource(env, capacity=c)
        id_petani = 1 # Inisialisasi ID Petani
        while True:
            yield env.timeout(random.expovariate(1.0 / interarrival))
            env.process(petani(env, tungku, id_petani))
            id_petani += 1

    env = simpy.Environment()
    env.process(setup(env))
    env.run(until=sim_time)

    rata_waktu_tunggu = sum(wait_times) / len(wait_times) if wait_times else 0
    utilisasi = (server_busy_time / (sim_time * c)) * 100

    return {
        "tungku": c,
        "wq": round(rata_waktu_tunggu, 2),
        "rho": round(min(utilisasi, 100), 2),
        "log_petani": log_petani # Kirim riwayat data ke Frontend
    }

@app.post("/api/simulate")
def hitung_simulasi(data: InputSimulasi):
    hasil_skenario = []
    for c in range(1, data.maks_tungku + 1):
        hasil = jalankan_simpy(data.waktu_antar_kedatangan, data.waktu_pelayanan, c)
        hasil_skenario.append(hasil)
    return {"status": "success", "data": hasil_skenario}