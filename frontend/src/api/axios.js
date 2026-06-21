import axios from 'axios';

// Je crée une instance Axios réutilisable dans tout mon projet
const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/', // Mon URL de base du backend Django
    headers: {
        'Content-Type': 'application/json',
    },
});

export default API;