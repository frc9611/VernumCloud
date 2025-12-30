<template>
  <nav class="nav">
    <h2 class="logo">Vernum Cloud</h2>

    <button class="menu-toggle" @click="menuOpen = !menuOpen">
      ☰
    </button>

    <ul :class="{ open: menuOpen }">
      <li><Router-link :to="{ name: 'home' }">Home</Router-link></li>
      <li><Router-link :to="{ name: 'about' }">Sobre</Router-link></li>
      <li><Router-link :to="{ name: 'about' }">Arquivos</Router-link></li>
      <li><Router-link :to="{ name: 'about' }">Fórum</Router-link></li>
      <li v-if="auth.isAuth && auth.getRole == 'ADMIN'"><Router-link :to="{ name: 'admin' }">Admin</Router-link></li>

      <li class="user-slot">
        <template v-if="auth.isAuth">    
          <Router-link :to="{ name: 'profile' }">
            <div class="user-box" :style="{'--bg-box-color': auth.getDivisionColor}">
              <div class="user-info">
                <span class="user-name">{{ auth.getName }}</span>
                <span class="user-division">{{ auth.getDivision }}</span>
              </div>

              <button class="logout-btn" @click="logout">
                Sair
              </button>
            </div>
          </Router-link>
        </template>

        <template v-else>
          <div class="user-box">
            <Router-link :to="{ name: 'login' }">Login</Router-link>
          </div>
          
        </template>
      </li>
    </ul>
  </nav>
  <router-view/>
</template>
<script setup>
  import {authStore} from '@/store/auth.js'
  import { useRouter } from 'vue-router';
import { ref } from 'vue'

const menuOpen = ref(false);

const auth = authStore();

const router = useRouter();

function logout(){
  auth.clear();
  router.push({name: 'login'});
}
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
  :root{
    --bg-box-color: #391c55;
  }
  body{
    margin: 0;
    font-family: "Outfit", sans-serif;
  }
  hr{
    border: none;
    border-top: 3px solid #865faf;
    width: 75%;
    max-width: 360px;
  }
  .centerFlex{
    display: flex;
    justify-content: center;
    height: 100vh;
  }
  .centerText{
    text-align: center;
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: #391c55;
    color: white;
  }

  .logo {
    margin: 0;
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    font-size: 26px;
    color: white;
    cursor: pointer;
  }

  .nav ul {
    display: flex;
    align-items: center;
    gap: 16px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav li a {
    color: white;
    text-decoration: none;
  }

  .user-box {
    display: flex;
    align-items: center;
    border: solid 3px #b4a0cf;
    background: #391C55;
    background: linear-gradient(180deg, #391C55 30%, var(--bg-box-color) 100%);
    /* background: #391c55; */
    border-radius: 14px;
    padding: 8px 10px;
    gap: 12px;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .user-name {
    font-weight: 600;
  }

  .user-division {
    font-size: 12px;
    color: #d4d4d4;
  }

  .logout-btn {
    background: #ef4444;
    border: none;
    color: white;
    width: 55px;
    height: 100%;
    min-height: 44px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }

  .logout-btn:hover {
    background: #dc2626;
  }

  .no-auth {
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .menu-toggle {
      display: block;
    }

    .nav ul {
      position: absolute;
      top: 61px;
      right: 0;
      flex-direction: column;
      background: #411b64df;
      width: 100%;
      display: none;
      padding: 16px;
    }

    .nav ul.open {
      display: flex;
    }

    .user-box {
      width: 100%;
      justify-content: space-between;
    }
  }
.information, .warning {
    display: inline-block;
    padding: 8px 15px;
    border-radius: 5px;
    margin-bottom: 20px;
    font-weight: bold;
    font-size: 0.9em;
    width: 80%;
    max-width: 400px;
    text-align: center;
  }

  .information {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }

  .warning {
    background-color: #fde69c;
    color: #4d3a00;
    border: 1px solid #ffbf00;
  }

  .main-menu {
    list-style-type: none;
    padding: 0;
    width: 100%;
    max-width: 600px;
  }

  .main-menu li {
    margin-bottom: 15px;
  }

  .menu-button {
    display: block;
    padding: 20px;
    text-align: center;
    text-decoration: none;
    font-size: 1.2em;
    font-weight: 600;
    color: #ffffff;
    background-color: #8864af;
    border-radius: 8px;
    border: 3px solid #5c288f;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease, transform 0.2s ease;
  }

  .menu-button:hover {
    background-color: #5c288f;
    transform: translateY(-2px);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
  }

  .menu-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .main-table {
  width: 100%;
  max-width: 1100px;
  border-collapse: collapse;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.main-table thead {
  background: #5c288f;
}

.main-table th {
  color: #fff;
  text-align: left;
  padding: 14px 16px;
  font-weight: 600;
}

.main-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #2e2e42;
  color: #eaeaea;
}

.main-table tbody tr:hover {
  background: #2a2a3d;
}

.main-table tbody tr:last-child td {
  border-bottom: none;
}

.status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status.active {
  background: #1e7f4d;
  color: #b6f2d6;
}

.status.inactive {
  background: #7f1e1e;
  color: #f2b6b6;
}

.table-search {
  width: 100%;
  max-width: 1100px;
  margin: 20px 0;
  padding: 12px 14px;
  border-radius: 8px;
  border: none;
  outline: none;
  font-size: 0.95rem;
  background: #2a2a3d;
  color: #fff;
}

.table-search::placeholder {
  color: #aaa;
}
</style>