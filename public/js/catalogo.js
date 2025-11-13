import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let productos = [];
let carrito = [];

const categoriasDiv = document.getElementById("categorias");
const carritoDiv = document.getElementById("carrito");
const filtroSelect = document.getElementById("filtroCategoria");
const buscador = document.getElementById("buscador");
const btnLimpiarFiltrosProducts = document.getElementById("btnLimpiarFiltrosProducts");

// Traer productos desde Supabase JSON
async function cargarProductos() {
    const { data, error } = await supabase
        .storage
        .from("productos")
        .download("productos.json");

    if (error && error.status !== 406) {
        console.error("Error al cargar productos:", error);
        return;
    }

    if (data) {
        const text = await data.text();
        productos = JSON.parse(text || "[]");
    } else {
        productos = [];
    }

    llenarCategorias();
    mostrarPorCategoria();
}

// Llenar select de categorías
function llenarCategorias() {
    const categorias = [...new Set(productos.map(p => p.categoria))];
    categorias.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        filtroSelect.appendChild(option);
    });
}

// Mostrar productos filtrados
function mostrarPorCategoria() {
    categoriasDiv.innerHTML = "";
    const categoriaSeleccionada = filtroSelect.value;
    const terminoBusqueda = buscador.value.toLowerCase().trim();

    let productosFiltrados = productos;

    if(categoriaSeleccionada !== "Todas") {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === categoriaSeleccionada);
    }

    if(terminoBusqueda){
        productosFiltrados = productosFiltrados.filter(p => p.nombre.toLowerCase().includes(terminoBusqueda));
    }

    if(productosFiltrados.length === 0){
        categoriasDiv.innerHTML = "<p>No se encontraron productos</p>";
        return;
    }

    const grid = document.createElement("div");
    grid.classList.add("catalogo");

    productosFiltrados.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
            <img src="${p.imagen}" alt="${p.nombre}">
            <div class="card-content">
                <p class="nombre">${p.nombre}</p>
                <p class="precio">L.${p.precio}</p>
                <input type="number" min="1" value="1" id="cant-${p.id}">
                <button onclick="agregarCarrito(${p.id})">Agregar al carrito</button>
            </div>
        `;
        grid.appendChild(card);
    });

    categoriasDiv.appendChild(grid);
}

// -------------------- CARRITO --------------------

window.agregarCarrito = function(id){
    const p = productos.find(x => x.id===id);
    const cant = parseInt(document.getElementById(`cant-${id}`).value);
    const item = carrito.find(x => x.id===id);
    if(item) item.cantidad += cant;
    else carrito.push({id, nombre: p.nombre, precio: p.precio, cantidad: cant});
    mostrarCarrito();
};

function mostrarCarrito(){
    carritoDiv.innerHTML = "";
    let total = 0;

    carrito.forEach(i => {
        const div = document.createElement("div");
        div.classList.add("carrito-item");
        div.innerHTML = `
            <span>${i.nombre}</span>
            <input type="number" min="1" value="${i.cantidad}" onchange="actualizarCantidad(${i.id}, this.value)">
            <span>L.${i.cantidad*i.precio}</span>
            <button onclick="eliminarDelCarrito(${i.id})">❌</button>
        `;
        carritoDiv.appendChild(div);
        total += i.cantidad*i.precio;
    });

    if(carrito.length>0){
        carritoDiv.innerHTML += `
            <div class="carrito-total"><strong>Total: L.${total}</strong></div>
            <button class="btn-limpiar" onclick="limpiarCarrito()">🗑️ Limpiar carrito</button>
        `;
    } else {
        carritoDiv.innerHTML = "<p class='carrito-vacio'>El carrito está vacío</p>";
    }
}

window.eliminarDelCarrito = function(id){
    carrito = carrito.filter(item => item.id !== id);
    mostrarCarrito();
};

window.actualizarCantidad = function(id, nuevaCantidad){
    const item = carrito.find(x => x.id===id);
    if(item) item.cantidad = parseInt(nuevaCantidad);
    mostrarCarrito();
};

window.limpiarCarrito = function(){
    carrito = [];
    mostrarCarrito();
};

// Enviar por WhatsApp
document.getElementById("enviarWhatsApp").addEventListener("click", ()=>{
    if(carrito.length===0){ alert("El carrito está vacío"); return; }
    let mensaje = "🛍 *Nuevo pedido*%0A";
    carrito.forEach(i=>mensaje+=`${i.nombre} - Cant: ${i.cantidad} - Subtotal: L.${i.cantidad*i.precio}%0A`);
    const total = carrito.reduce((a,b)=>a+b.cantidad*b.precio,0);
    mensaje+=`*TOTAL: L.${total}*`;
    window.open("https://wa.me/50493694250?text="+mensaje);
});

// Listeners
filtroSelect.addEventListener("change", mostrarPorCategoria);
buscador.addEventListener("input", mostrarPorCategoria);
btnLimpiarFiltrosProducts.addEventListener("click", e=>{
    e.preventDefault();
    filtroSelect.value="Todas";
    buscador.value="";
    mostrarPorCategoria();
});

// Inicializar
cargarProductos();
