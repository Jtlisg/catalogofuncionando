// -------------------- IMPORTS --------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------- VARIABLES --------------------
let productos = [];
let editandoId = null;

const catalogo = document.getElementById("catalogo");
const formProducto = document.getElementById("formProducto");
const nombreInput = document.getElementById("nombre");
const categoriaInput = document.getElementById("categoria");
const precioInput = document.getElementById("precio");
const imagenInput = document.getElementById("imagen");
const filtroCategoria = document.getElementById("filtroCategoria");
const busquedaAdmin = document.getElementById("busquedaAdmin");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const notificacionesContainer = document.getElementById("notificaciones-container");

const imagenFile = document.getElementById("imagenFile");
const btnSubirImagen = document.getElementById("btnSubirImagen");
const imgPreview = document.getElementById("imgPreview");
const imagenPlaceholder = document.getElementById("imagenPlaceholder");
const estadoImagen = document.getElementById("estadoImagen");

const loginScreen = document.getElementById("login-screen");
const adminPanel = document.getElementById("admin-panel");
const formLogin = document.getElementById("formLogin");
const passwordInput = document.getElementById("passwordInput");

// -------------------- FUNCIONES --------------------

// Vista previa de imagen
imagenFile.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        imgPreview.src = event.target.result;
        imgPreview.style.display = "block";
        imagenPlaceholder.style.display = "none";
    };
    reader.readAsDataURL(file);
});

// Sanitizar nombres de archivo
function sanitizeFileName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Subir imagen a Supabase y devolver URL pública
async function subirImagen(file) {
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    try {
        const { data, error } = await supabase
            .storage
            .from("images")
            .upload(fileName, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;

        const { publicUrl } = supabase
            .storage
            .from("images")
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err) {
        console.error("Error subiendo imagen:", err);
        throw err;
    }
}

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'exito', duracion = 3000) {
    const notif = document.createElement('div');
    notif.className = `notificacion notificacion-${tipo}`;
    notif.innerHTML = `
        <div class="notificacion-contenido">
            <span class="notificacion-icono">${tipo === 'exito' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notificacion-texto">${mensaje}</span>
        </div>
        <button class="notificacion-cerrar" onclick="this.parentElement.remove()">×</button>
    `;
    notificacionesContainer.appendChild(notif);
    if (duracion > 0) setTimeout(() => { notif.remove(); }, duracion);
}

// -------------------- LOGIN --------------------
formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if(password === ADMIN_KEY){
        loginScreen.classList.add("oculto");
        adminPanel.classList.remove("oculto");
        mostrarNotificacion("Bienvenido al panel", "exito");
        cargarProductos();
    } else {
        mostrarNotificacion("Contraseña incorrecta", "error");
        passwordInput.value = "";
    }
});

// -------------------- CRUD PRODUCTOS --------------------

// Cargar productos desde Supabase
async function cargarProductos() {
    try {
        const { data, error } = await supabase
            .storage
            .from("json")
            .download("productos.json");

        if (error && error.status !== 406) throw error;

        if(data){
            const text = await data.text();
            productos = JSON.parse(text || "[]");
        } else {
            productos = [];
        }

        actualizarCategorias();
        aplicarFiltros();
    } catch (err) {
        console.error("Error al cargar productos:", err);
        productos = [];
        mostrarNotificacion("Error al cargar productos", "error");
    }
}

// Guardar productos (manteniendo todos)
async function guardarProductos() {
    try {
        const { data } = await supabase
            .storage
            .from("json")
            .download("productos.json");

        let productosActuales = [];
        if(data){
            const text = await data.text();
            productosActuales = JSON.parse(text || "[]");
        }

        // Fusionar: reemplaza editados y agrega nuevos
        productos.forEach(p => {
            const idx = productosActuales.findIndex(pa => pa.id === p.id);
            if(idx !== -1){
                productosActuales[idx] = p;
            } else {
                productosActuales.push(p);
            }
        });

        const blob = new Blob([JSON.stringify(productosActuales, null, 2)], { type: "application/json" });
        const { error: uploadError } = await supabase
            .storage
            .from("json")
            .upload("productos.json", blob, { upsert: true });

        if(uploadError) throw uploadError;

        productos = productosActuales;

    } catch(err){
        console.error("Error guardando productos:", err);
        mostrarNotificacion("Error guardando productos", "error");
    }
}

// Subir imagen desde botón (solo admin)
btnSubirImagen.addEventListener("click", async () => {
    if (!imagenFile.files[0]) {
        estadoImagen.textContent = "Selecciona una imagen primero";
        estadoImagen.classList.add("error");
        return;
    }
    try {
        estadoImagen.textContent = "Subiendo...";
        estadoImagen.classList.remove("error", "exito");
        const url = await subirImagen(imagenFile.files[0]);
        imagenInput.value = url;
        estadoImagen.textContent = "✅ Imagen subida correctamente";
        estadoImagen.classList.add("exito");
        imagenFile.value = "";
        setTimeout(() => {
            imgPreview.style.display = "none";
            imagenPlaceholder.style.display = "block";
            estadoImagen.textContent = "";
            estadoImagen.classList.remove("exito");
        }, 2000);
    } catch (err) {
        estadoImagen.textContent = `❌ ${err.message}`;
        estadoImagen.classList.add("error");
    }
});

// Mostrar productos en pantalla
function mostrarProductos(lista = productos) {
    catalogo.innerHTML = "";
    if(!lista.length) {
        catalogo.innerHTML = '<p class="sin-resultados">No hay productos</p>';
        return;
    }

    lista.forEach(p => {
        const div = document.createElement("div");
        div.classList.add("card", "admin-card");
        div.innerHTML = `
            <img src="${p.imagen || 'https://via.placeholder.com/150'}" alt="${p.nombre}">
            <div class="card-content">
                <p><strong>${p.nombre}</strong></p>
                <p>Categoría: ${p.categoria}</p>
                <p>Precio: L.${p.precio}</p>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                    <button onclick="editarProducto(${p.id})">✏️ Editar</button>
                    <button onclick="eliminarProducto(${p.id})">❌ Eliminar</button>
                </div>
            </div>
        `;
        catalogo.appendChild(div);
    });
}

// Actualiza select de categorías
function actualizarCategorias() {
    const cats = Array.from(new Set(productos.map(p => p.categoria))).filter(Boolean).sort();
    filtroCategoria.innerHTML = '<option value="all">Todas</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// Aplicar filtros
function aplicarFiltros() {
    const q = busquedaAdmin.value.trim().toLowerCase();
    const cat = filtroCategoria.value;
    const resultado = productos.filter(p => {
        const matchCat = (cat==='all') || (p.categoria===cat);
        if(!matchCat) return false;
        if(!q) return true;
        const hay = `${p.nombre} ${p.categoria} ${p.precio}`.toLowerCase();
        return hay.includes(q);
    });
    mostrarProductos(resultado);
}

// Editar producto
function editarProducto(id) {
    const p = productos.find(x => x.id===id);
    if(!p) return;
    editandoId = id;
    nombreInput.value = p.nombre;
    categoriaInput.value = p.categoria;
    precioInput.value = p.precio;
    imagenInput.value = p.imagen || "";
}

// Eliminar producto
async function eliminarProducto(id) {
    if(!confirm("¿Seguro quieres eliminar este producto?")) return;
    productos = productos.filter(p => p.id!==id);
    await guardarProductos();
    mostrarNotificacion("Producto eliminado", "exito");
    cargarProductos();
}

// Hacer accesibles las funciones desde HTML
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
