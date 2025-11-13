import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let productos = [];

// Traer productos desde JSON en Supabase
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

    mostrarCategorias();
}

// Mostrar categorías como tarjetas
function mostrarCategorias() {
    const categoriasGrid = document.getElementById("categorias-grid");
    categoriasGrid.innerHTML = "";

    const categorias = [...new Set(productos.map(p => p.categoria))];

    categorias.forEach(categoria => {
        const card = document.createElement("div");
        card.classList.add("categoria-card");

        const primerProducto = productos.find(p => p.categoria === categoria);
        const imagen = primerProducto ? primerProducto.imagen : "https://via.placeholder.com/300?text=Categoría";

        card.innerHTML = `
            <div class="categoria-card-image">
                <img src="${imagen}" alt="${categoria}">
            </div>
            <div class="categoria-card-content">
                <h3>${categoria}</h3>
                <p>${productos.filter(p => p.categoria === categoria).length} productos</p>
                <a href="productos.html?categoria=${encodeURIComponent(categoria)}" class="btn-categoria">Ver Categoría</a>
            </div>
        `;

        categoriasGrid.appendChild(card);
    });
}

// Inicializar
cargarProductos();
