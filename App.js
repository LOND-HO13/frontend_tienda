import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const API_URL = 'https://antiquely-thousand-disabled.ngrok-free.dev/api';
const HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

// PIN exclusivo para que solo tú puedas ver costos y editar precios
const PIN_ADMIN = '1234';

export default function App() {
  const [vistaActual, setVistaActual] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Seguridad de Administrador para Costos y Edición
  const [modoAdmin, setModoAdmin] = useState(false);
  const [modalPinVisible, setModalPinVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Estados de Venta y Carrito
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [modalDetalleVenta, setModalDetalleVenta] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Modal de Cantidad/Kilos
  const [modalCantidadVisible, setModalCantidadVisible] = useState(false);
  const [productoParaCantidad, setProductoParaCantidad] = useState(null);
  const [cantidadInput, setCantidadInput] = useState('1');

  // Cámara / Escáner
  const [permisoCamara, solicitarPermisoCamara] = useCameraPermissions();
  const [modalEscanerVisible, setModalEscanerVisible] = useState(false);
  const [modoEscaner, setModoEscaner] = useState('venta');
  const [escaneadoBloqueado, setEscaneadoBloqueado] = useState(false);

  // Estados de Inventario (Con Precio de Compra y Precio de Venta)
  const [modalProductoVisible, setModalProductoVisible] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodPrecioCosto, setProdPrecioCosto] = useState(''); // Precio comerciante
  const [prodPrecioVenta, setProdPrecioVenta] = useState(''); // Precio al público
  const [prodStock, setProdStock] = useState('');
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodCategoria, setProdCategoria] = useState(null);
  const [prodEsPesaje, setProdEsPesaje] = useState(false);

  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');

  // Estados de Clientes, Cartera, Historial y Reporte de Cierre
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [deudasDetalladas, setDeudasDetalladas] = useState([]);
  const [modalHistorialVisible, setModalHistorialVisible] = useState(false);
  const [modalHistorialVentas, setModalHistorialVentas] = useState(false);
  const [listaVentas, setListaVentas] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalAbonoVisible, setModalAbonoVisible] = useState(false);
  const [clienteAbono, setClienteAbono] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');

  // Modal de Informe Detallado de Cierre de Caja
  const [modalReporteCierre, setModalReporteCierre] = useState(false);
  const [datosCierre, setDatosCierre] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    fetch(`${API_URL}/productos/`, { headers: HEADERS })
      .then(res => res.json())
      .then(datos => {
        setProductos(datos.results || datos);
        setCargando(false);
      })
      .catch(err => {
        console.error(err);
        setCargando(false);
      });

    fetch(`${API_URL}/categorias/`, { headers: HEADERS })
      .then(res => res.json())
      .then(datos => setCategorias(datos.results || datos || []))
      .catch(err => console.error(err));

    fetch(`${API_URL}/clientes/`, { headers: HEADERS })
      .then(res => res.json())
      .then(datos => setClientes(datos.results || datos))
      .catch(err => console.error(err));
  };

  // --- AUTENTICACIÓN DE ADMINISTRADOR ---
  const alternarModoAdmin = () => {
    if (modoAdmin) {
      setModoAdmin(false);
      Alert.alert("Modo Protegido", "Se han ocultado los precios de costo y bloqueado la edición.");
    } else {
      setPinInput('');
      setModalPinVisible(true);
    }
  };

  const verificarPin = () => {
    if (pinInput === PIN_ADMIN) {
      setModoAdmin(true);
      setModalPinVisible(false);
      setPinInput('');
    } else {
      Alert.alert("PIN Incorrecto", "Solo el propietario puede modificar precios y ver costos.");
    }
  };

  // --- LÓGICA DE ESCÁNER ---
  const abrirEscaner = async (modo) => {
    if (!permisoCamara?.granted) {
      const resultado = await solicitarPermisoCamara();
      if (!resultado.granted) {
        return Alert.alert("Permiso denegado", "Debes permitir el acceso a la cámara.");
      }
    }
    setModoEscaner(modo);
    setEscaneadoBloqueado(false);
    setModalEscanerVisible(true);
  };

  const alLeerCodigoBarras = ({ data }) => {
    if (escaneadoBloqueado) return;
    setEscaneadoBloqueado(true);
    setModalEscanerVisible(false);

    const codigoLeido = String(data).trim();

    if (modoEscaner === 'registro') {
      setProdCodigo(codigoLeido);
      Alert.alert("Código capturado", `Código asignado: ${codigoLeido}`);
    } else if (modoEscaner === 'venta') {
      const prodEncontrado = productos.find(p => String(p.codigo_barras || '').trim() === codigoLeido);
      if (!prodEncontrado) {
        return Alert.alert("No registrado", `No existe ningún producto con el código ${codigoLeido}.`);
      }
      if (Number(prodEncontrado.stock_actual) <= 0) {
        return Alert.alert("Fuera de Stock", `El producto "${prodEncontrado.nombre}" está agotado.`);
      }
      abrirModalCantidad(prodEncontrado);
    }
  };

  // --- LÓGICA DE CARRITO Y CANTIDADES ---
  const abrirModalCantidad = (producto) => {
    if (Number(producto.stock_actual) <= 0) {
      return Alert.alert("Sin Stock", "Este producto está fuera de stock.");
    }
    setProductoParaCantidad(producto);
    setCantidadInput(producto.permite_decimales ? '0.500' : '1');
    setModalCantidadVisible(true);
  };

  const confirmarAgregarConCantidad = () => {
    if (!productoParaCantidad) return;
    const cant = Number(cantidadInput.replace(',', '.'));

    if (isNaN(cant) || cant <= 0) {
      return Alert.alert("Cantidad inválida", "Ingresa un valor mayor a cero.");
    }
    if (!productoParaCantidad.permite_decimales && !Number.isInteger(cant)) {
      return Alert.alert("Producto Unitario", "Este producto se vende por unidad entera.");
    }
    if (cant > Number(productoParaCantidad.stock_actual)) {
      return Alert.alert("Stock insuficiente", `Solo hay ${formatearStock(productoParaCantidad)} disponibles.`);
    }

    setCarrito((carritoActual) => {
      const existe = carritoActual.find(item => item.id_producto === productoParaCantidad.id_producto);
      if (existe) {
        const nuevaCant = Number((existe.cantidad + cant).toFixed(3));
        if (nuevaCant > Number(productoParaCantidad.stock_actual)) {
          Alert.alert("Límite alcanzado", "Superas el stock disponible.");
          return carritoActual;
        }
        return carritoActual.map(item =>
          item.id_producto === productoParaCantidad.id_producto ? { ...item, cantidad: nuevaCant } : item
        );
      }
      return [...carritoActual, { ...productoParaCantidad, cantidad: cant }];
    });

    setModalCantidadVisible(false);
    setProductoParaCantidad(null);
  };

  const tocarProductoEnVentas = (producto) => {
    const stockDisponible = Number(producto.stock_actual);
    if (stockDisponible <= 0) {
      return Alert.alert("Sin Stock", "Este producto está fuera de stock.");
    }

    // Buscamos cuántos hay actualmente en el carrito de este producto
    const existe = carrito.find(item => item.id_producto === producto.id_producto);
    const cantActual = existe ? existe.cantidad : 0;

    // 🛡️ EXCEPCIÓN: Verifica si al agregar uno más se supera el límite
    if (cantActual >= stockDisponible) {
      return Alert.alert(
        "Límite Alcanzado 🚫", 
        `No puedes vender más de lo que hay en inventario.\n\nYa tienes ${cantActual} en el carrito y el stock total es de ${stockDisponible}.`
      );
    }

    if (producto.permite_decimales) {
      abrirModalCantidad(producto);
    } else {
      setCarrito((carritoActual) => {
        if (existe) {
          return carritoActual.map(item =>
            item.id_producto === producto.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item
          );
        }
        return [...carritoActual, { ...producto, cantidad: 1 }];
      });
    }
  };

  // --- LÓGICA DE INVENTARIO (CON PRECIO DE COMPRA Y VENTA) ---
  const abrirFormularioCrearProducto = () => {
    if (!modoAdmin) return Alert.alert("Acceso Restringido", "Desbloquea el Modo Admin (candado superior) para crear o modificar productos.");
    setEditandoProducto(null);
    setProdNombre('');
    setProdPrecioCosto('');
    setProdPrecioVenta('');
    setProdStock('');
    setProdCodigo('');
    setProdCategoria(categoriaFiltro);
    setProdEsPesaje(false);
    setModalProductoVisible(true);
  };

  const abrirFormularioEditarProducto = (item) => {
    if (!modoAdmin) return Alert.alert("Acceso Restringido", "Desbloquea el Modo Admin para editar precios o nombres.");
    setEditandoProducto(item);
    setProdNombre(item.nombre);
    setProdPrecioCosto(String(item.precio_mayorista || item.precio_detal));
    setProdPrecioVenta(String(item.precio_detal));
    setProdStock(String(item.stock_actual));
    setProdCodigo(item.codigo_barras ? String(item.codigo_barras) : '');
    setProdCategoria(item.id_categoria || null);
    setProdEsPesaje(Boolean(item.permite_decimales));
    setModalProductoVisible(true);
  };

  const guardarProducto = async () => {
    if (!prodNombre.trim() || !prodPrecioVenta || isNaN(prodPrecioVenta) || !prodPrecioCosto || isNaN(prodPrecioCosto)) {
      return Alert.alert("Datos incompletos", "El nombre, el precio de compra y el precio de venta son obligatorios.");
    }

    const costo = Number(prodPrecioCosto);
    const venta = Number(prodPrecioVenta);

    if (venta < costo) {
      return Alert.alert("Alerta de Pérdida", "El precio de venta al público no puede ser menor al precio de compra del comerciante.");
    }

    const payload = {
      nombre: prodNombre.trim(),
      precio_costo: costo,
      precio_detal: venta,
      stock_actual: prodStock === '' ? 0 : Number(String(prodStock).replace(',', '.')),
      codigo_barras: prodCodigo.trim() === '' ? null : prodCodigo.trim(),
      id_categoria: prodCategoria,
      permite_decimales: prodEsPesaje,
      unidad_medida: prodEsPesaje ? 'KG' : 'UND'
    };

    try {
      const url = editandoProducto
        ? `${API_URL}/productos/${editandoProducto.id_producto}/editar/`
        : `${API_URL}/productos/crear/`;
      const metodo = editandoProducto ? 'PUT' : 'POST';

      const respuesta = await fetch(url, {
        method: metodo,
        headers: HEADERS,
        body: JSON.stringify(payload)
      });

      const resultado = await respuesta.json();
      if (respuesta.ok) {
        Alert.alert("Éxito", editandoProducto ? "Producto actualizado." : "Producto registrado.");
        setModalProductoVisible(false);
        cargarDatos();
      } else {
        Alert.alert("Error", resultado.error || JSON.stringify(resultado));
      }
    } catch (error) {
      Alert.alert("Error de Red", "No se pudo guardar el producto.");
    }
  };

  const sacarDeStockHastaNuevaOrden = (producto) => {
    if (!modoAdmin) return Alert.alert("Acceso Restringido", "Desbloquea el Modo Admin para modificar el stock.");
    Alert.alert(
      "Sacar de Stock",
      `¿Dejar "${producto.nombre}" fuera de stock hasta nueva orden?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Sacar de Stock",
          style: "destructive",
          onPress: async () => {
            try {
              const respuesta = await fetch(`${API_URL}/productos/${producto.id_producto}/editar/`, {
                method: 'PATCH',
                headers: HEADERS,
                body: JSON.stringify({ stock_actual: 0 })
              });
              if (respuesta.ok) cargarDatos();
            } catch (error) {
              Alert.alert("Error de Red", "Fallo de conexión.");
            }
          }
        }
      ]
    );
  };

  const crearNuevaCategoria = async () => {
    if (!nuevaCategoriaNombre.trim()) return Alert.alert("Error", "Escribe el nombre de la categoría.");
    try {
      const respuesta = await fetch(`${API_URL}/categorias/`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ nombre: nuevaCategoriaNombre.trim() })
      });
      if (respuesta.ok) {
        setNuevaCategoriaNombre('');
        setModalCategoriaVisible(false);
        cargarDatos();
      }
    } catch (error) {
      Alert.alert("Error de Red", "Fallo de conexión.");
    }
  };

  const formatearStock = (item) => {
    const stockNum = Number(item.stock_actual || 0);
    if (item.permite_decimales || item.unidad_medida === 'KG') {
      return `${stockNum.toFixed(3)} kg`;
    }
    return `${Math.trunc(stockNum)} und`;
  };

  const productosFiltrados = categoriaFiltro
    ? productos.filter(p => p.id_categoria === categoriaFiltro)
    : productos;

  const dineroTotal = carrito.reduce((suma, item) => suma + (Number(item.precio_detal) * item.cantidad), 0);

  // --- FUNCIONES DE VENTAS, INFORMES Y CIERRE ---
  const cargarHistorialVentas = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/ventas/historial/`, { headers: HEADERS });
      const datos = await respuesta.json();
      setListaVentas(datos);
      setModalHistorialVentas(true);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el historial de ventas.");
    }
  };

  const registrarNuevoCliente = async () => {
    if (!nuevoNombre || !nuevoApellido) return Alert.alert("Faltan datos", "Nombre y apellido son obligatorios.");
    try {
      const respuesta = await fetch(`${API_URL}/clientes/`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          nombre_completo: `${nuevoNombre} ${nuevoApellido}`.trim(),
          telefono: nuevoTelefono || "0000000000",
          cupo_credito: 200000,
          deuda_actual: 0
        })
      });
      if (respuesta.ok) {
        Alert.alert("Éxito", "Vecino registrado.");
        setNuevoNombre(''); setNuevoApellido(''); setNuevoTelefono('');
        setCreandoCliente(false);
        cargarDatos();
      }
    } catch (error) {
      Alert.alert("Error de Red", "No se pudo conectar.");
    }
  };

  const ejecutarVenta = async (idCliente = null, metodoExplicito = null) => {
    const esCredito = metodoExplicito === 'Crédito' || (idCliente !== null && idCliente !== undefined);
    const metodoFinal = esCredito ? 'Crédito' : 'Efectivo';

    // 🛡️ BLINDAJE FRONTEND: Validar cupo de crédito antes de enviar al servidor
    if (esCredito) {
      const clienteSeleccionado = clientes.find(c => c.id_cliente === idCliente);
      if (clienteSeleccionado) {
        const fianza = dineroTotal * 0.10;
        const deudaProyectada = Number(clienteSeleccionado.deuda_actual) + dineroTotal + fianza;
        
        if (deudaProyectada > Number(clienteSeleccionado.cupo_credito)) {
          return Alert.alert(
            "Cupo Excedido 🚫", 
            `El vecino no tiene cupo suficiente.\nCupo: $${clienteSeleccionado.cupo_credito}\nDeuda si compra esto: $${deudaProyectada}`
          );
        }
      }
    }

    const carritoParaAPI = carrito.map(item => ({
      id_producto: item.id_producto || item.id,
      cantidad: item.cantidad
    }));

    const datosVenta = {
      metodo_pago: metodoFinal,
      carrito: carritoParaAPI,
      ...(esCredito ? { id_cliente: idCliente } : {})
    };
    
    try {
      const respuesta = await fetch(`${API_URL}/procesar-venta/`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(datosVenta)
      });
      const resultado = await respuesta.json();

      if (respuesta.ok) {
        Alert.alert("Venta Exitosa", `Factura #${resultado.id_venta} registrada en modalidad: ${metodoFinal}.`);
        setCarrito([]);
        setModalVisible(false);
        setModalDetalleVenta(false);
        setMetodoPago('Efectivo');
        cargarDatos();
      } else {
        Alert.alert("Error", resultado.error || JSON.stringify(resultado));
      }
    } catch (error) {
      Alert.alert("Error de Red", "No se pudo conectar con el servidor.");
    }
  };

  const registrarAbono = async () => {
    const monto = Number(montoAbono);
    const deudaActual = Number(clienteAbono?.deuda_actual || 0);
    if (!montoAbono || isNaN(monto) || monto <= 0) return Alert.alert("Error", "Ingresa un monto válido.");
    if (monto > deudaActual) return Alert.alert("Monto excedido", `El abono supera la deuda actual ($${deudaActual}).`);

    try {
      const respuesta = await fetch(`${API_URL}/abonos/`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ id_cliente: clienteAbono.id_cliente, monto })
      });
      if (respuesta.ok) {
        Alert.alert("Abono Exitoso", "La deuda ha sido actualizada.");
        setModalAbonoVisible(false);
        setMontoAbono('');
        cargarDatos();
      }
    } catch (error) {
      Alert.alert("Error de Red", "Fallo de conexión.");
    }
  };

  const ejecutarCierreCaja = () => {
    Alert.alert("Confirmar Corte de Caja", "¿Deseas generar el informe y corte de caja de este turno?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, Generar Cierre",
        onPress: async () => {
          try {
            const respuesta = await fetch(`${API_URL}/cierre-caja/`, { method: 'POST', headers: HEADERS });
            const resultado = await respuesta.json();
            if (respuesta.ok) {
              setDatosCierre(resultado);
              setModalReporteCierre(true);
            } else {
              Alert.alert("Aviso de Caja", resultado.error || "No hay movimientos nuevos para cerrar.");
            }
          } catch (error) {
            Alert.alert("Error de Red", "No se pudo conectar con el servidor.");
          }
        }
      }
    ]);
  };

  const verDetallesDeuda = async (cliente) => {
    setClienteSeleccionado(cliente);
    try {
      const respuesta = await fetch(`${API_URL}/cartera/detalles/${cliente.id_cliente}/`, { headers: HEADERS });
      const datos = await respuesta.json();
      setDeudasDetalladas(datos);
      setModalHistorialVisible(true);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el detalle.");
    }
  };

  if (cargando) {
    return <View style={styles.centro}><ActivityIndicator size="large" color="#3498db" /></View>;
  }

  const deudores = clientes.filter(c => (Number(c.deuda_actual) || 0) > 0);
  const margenFormulario = (Number(prodPrecioVenta) || 0) - (Number(prodPrecioCosto) || 0);

  return (
    <View style={styles.contenedor}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.titulo}>Tienda Vivian</Text>
        <TouchableOpacity
          style={{ backgroundColor: modoAdmin ? '#e67e22' : '#7f8c8d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}
          onPress={alternarModoAdmin}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
            {modoAdmin ? '🔓 Modo Admin' : '🔒 Modo Cajero'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MENÚ SUPERIOR */}
      <View style={styles.menuSuperior}>
        <TouchableOpacity style={[styles.botonMenu, vistaActual === 'ventas' && styles.menuActivo]} onPress={() => setVistaActual('ventas')}>
          <Text style={[styles.textoMenu, vistaActual === 'ventas' && styles.textoMenuActivo]}>Ventas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonMenu, vistaActual === 'inventario' && styles.menuActivo]} onPress={() => setVistaActual('inventario')}>
          <Text style={[styles.textoMenu, vistaActual === 'inventario' && styles.textoMenuActivo]}>Inventario</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonMenu, vistaActual === 'cartera' && styles.menuActivo]} onPress={() => setVistaActual('cartera')}>
          <Text style={[styles.textoMenu, vistaActual === 'cartera' && styles.textoMenuActivo]}>Cartera</Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE CATEGORÍAS */}
      {(vistaActual === 'ventas' || vistaActual === 'inventario') && (
        <View style={{ marginBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.chipCategoria, categoriaFiltro === null && styles.chipActivo]} onPress={() => setCategoriaFiltro(null)}>
              <Text style={[styles.textoChip, categoriaFiltro === null && styles.textoChipActivo]}>Todas</Text>
            </TouchableOpacity>
            {categorias.map(cat => (
              <TouchableOpacity
                key={cat.id_categoria}
                style={[styles.chipCategoria, categoriaFiltro === cat.id_categoria && styles.chipActivo]}
                onPress={() => setCategoriaFiltro(cat.id_categoria)}
              >
                <Text style={[styles.textoChip, categoriaFiltro === cat.id_categoria && styles.textoChipActivo]}>{cat.nombre}</Text>
              </TouchableOpacity>
            ))}
            {vistaActual === 'inventario' && modoAdmin && (
              <TouchableOpacity style={[styles.chipCategoria, { backgroundColor: '#2ecc71' }]} onPress={() => setModalCategoriaVisible(true)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Categoría</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* VISTA 1: VENTAS */}
      {vistaActual === 'ventas' && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <TouchableOpacity style={[styles.botonAccionSuperior, { backgroundColor: '#2980b9', flex: 1, marginRight: 5 }]} onPress={() => abrirEscaner('venta')}>
              <Text style={styles.textoBotonBlanco}>📷 Escanear Código</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonAccionSuperior, { backgroundColor: '#8e44ad', flex: 1, marginLeft: 5 }]} onPress={cargarHistorialVentas}>
              <Text style={styles.textoBotonBlanco}>🧾 Informe Ventas</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.botonAccionSuperior, { backgroundColor: '#34495e', marginBottom: 10 }]} onPress={ejecutarCierreCaja}>
            <Text style={styles.textoBotonBlanco}>📊 Realizar Cierre e Informe de Caja</Text>
          </TouchableOpacity>

          <FlatList
            data={productosFiltrados}
            keyExtractor={i => i.id_producto.toString()}
            contentContainerStyle={{ paddingBottom: 160 }}
            renderItem={({ item }) => {
              const agotado = Number(item.stock_actual) <= 0;
              
              // Verificamos cuánto llevamos de este producto en el carrito
              const enCarrito = carrito.find(p => p.id_producto === item.id_producto);
              const cantidadLlevada = enCarrito ? enCarrito.cantidad : 0;
              const limiteAlcanzado = cantidadLlevada >= Number(item.stock_actual);

              return (
                <View style={[styles.tarjeta, agotado && { opacity: 0.55, backgroundColor: '#eaecee' }]}>
                  <View style={styles.infoProducto}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <Text style={styles.precio}>
                      Venta: ${item.precio_detal} / {item.permite_decimales ? 'kg' : 'und'}
                    </Text>
                    <Text style={[styles.stock, (agotado || limiteAlcanzado) && { color: '#e74c3c', fontWeight: 'bold' }]}>
                      {agotado ? 'FUERA DE STOCK' : `Disp: ${formatearStock(item)}`}
                    </Text>
                    
                    {/* 🛒 NUEVO INDICADOR VISUAL: Muestra cuánto llevas agregado */}
                    {cantidadLlevada > 0 && (
                      <Text style={{ color: '#2980b9', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                        🛒 Llevas: {cantidadLlevada} {item.permite_decimales ? 'kg' : 'und'}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.botonAgregar, (agotado || limiteAlcanzado) && { backgroundColor: '#95a5a6' }]}
                    disabled={agotado} // Permite tocar si el límite se alcanzó para mostrar la alerta
                    onPress={() => tocarProductoEnVentas(item)}
                  >
                    <Text style={styles.textoBoton}>
                      {agotado ? 'Agotado' : (limiteAlcanzado ? 'Límite Máx' : '+ Añadir')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {carrito.length > 0 && (
            <View style={styles.contenedorBarra}>
              <View style={styles.barraCarrito}>
                <View>
                  <Text style={styles.textoCarrito}>Productos: {carrito.length}</Text>
                  <Text style={styles.totalCarrito}>Total: ${dineroTotal.toFixed(0)}</Text>
                </View>
                <TouchableOpacity style={{ backgroundColor: '#27ae60', padding: 14, borderRadius: 8 }} onPress={() => setModalDetalleVenta(true)}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Cobrar / Detalle</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {/* VISTA 2: INVENTARIO */}
      {vistaActual === 'inventario' && (
        <>
          {modoAdmin ? (
            <TouchableOpacity style={[styles.botonAccionSuperior, { backgroundColor: '#27ae60', marginBottom: 12 }]} onPress={abrirFormularioCrearProducto}>
              <Text style={styles.textoBotonBlanco}>+ Crear Nuevo Producto</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ffeeba' }}>
              <Text style={{ color: '#856404', fontSize: 13, textAlign: 'center' }}>
                🔒 Activa el "Modo Admin" arriba a la derecha para ver precios de compra y editar productos.
              </Text>
            </View>
          )}

          <FlatList
            data={productosFiltrados}
            keyExtractor={i => i.id_producto.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const agotado = Number(item.stock_actual) <= 0;
              const costo = Number(item.precio_mayorista || item.precio_detal);
              const venta = Number(item.precio_detal);
              const gananciaUnit = venta - costo;

              return (
                <View style={styles.tarjeta}>
                  <View style={styles.infoProducto}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <Text style={styles.precio}>Público: ${venta.toFixed(0)} ({item.permite_decimales ? 'KG' : 'UND'})</Text>
                    {modoAdmin && (
                      <Text style={{ fontSize: 13, color: '#2980b9', fontWeight: 'bold', marginTop: 2 }}>
                        Costo Comerciante: ${costo.toFixed(0)} | Ganancia: +${gananciaUnit.toFixed(0)}
                      </Text>
                    )}
                    <Text style={[styles.stock, agotado && { color: '#e74c3c', fontWeight: 'bold' }]}>
                      {agotado ? '🚫 Fuera de stock hasta nueva orden' : `Stock actual: ${formatearStock(item)}`}
                    </Text>
                    {item.codigo_barras ? <Text style={{ fontSize: 11, color: '#7f8c8d' }}>📊 Cód: {item.codigo_barras}</Text> : null}
                  </View>

                  {modoAdmin && (
                    <View style={{ flexDirection: 'column', gap: 6 }}>
                      <TouchableOpacity style={[styles.botonAgregar, { backgroundColor: '#f39c12' }]} onPress={() => abrirFormularioEditarProducto(item)}>
                        <Text style={styles.textoBoton}>Editar</Text>
                      </TouchableOpacity>
                      {!agotado && (
                        <TouchableOpacity style={[styles.botonAgregar, { backgroundColor: '#e74c3c' }]} onPress={() => sacarDeStockHastaNuevaOrden(item)}>
                          <Text style={[styles.textoBoton, { fontSize: 12 }]}>Sacar Stock</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        </>
      )}

      {/* VISTA 3: CARTERA */}
      {vistaActual === 'cartera' && (
        <FlatList
          data={deudores}
          keyExtractor={c => c.id_cliente.toString()}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No hay deudas pendientes.</Text>}
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <TouchableOpacity style={styles.infoProducto} onPress={() => verDetallesDeuda(item)}>
                <Text style={styles.nombre}>{item.nombre_completo}</Text>
                <Text style={[styles.precio, { color: '#e74c3c' }]}>Debe: ${item.deuda_actual}</Text>
                <Text style={{ color: '#3498db', fontSize: 12, marginTop: 4, textDecorationLine: 'underline' }}>Ver facturas pendientes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonAgregar, { backgroundColor: '#2ecc71' }]} onPress={() => { setClienteAbono(item); setModalAbonoVisible(true); }}>
                <Text style={styles.textoBoton}>Abonar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* MODAL: PIN DE ADMINISTRADOR */}
      <Modal visible={modalPinVisible} animationType="fade" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Acceso de Propietario</Text>
            <Text style={{ textAlign: 'center', marginBottom: 12, color: '#555' }}>
              Ingresa tu PIN para ver costos de compra y modificar precios:
            </Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 8 }]}
              placeholder="****"
              keyboardType="numeric"
              secureTextEntry={true}
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus={true}
            />
            <TouchableOpacity style={styles.botonGuardarCliente} onPress={verificarPin}>
              <Text style={styles.textoBoton}>Desbloquear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalPinVisible(false)}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREAR / EDITAR PRODUCTO (CON PRECIO COMERCIANTE Y VENTA) */}
      <Modal visible={modalProductoVisible} animationType="slide" transparent={true}>
        <View style={styles.modalFondo}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} style={{ width: '100%' }}>
            <View style={[styles.modalCaja, { width: '92%' }]}>
              <Text style={styles.modalTitulo}>{editandoProducto ? 'Editar Producto' : 'Nuevo Producto'}</Text>

              <Text style={styles.label}>Nombre del Producto:</Text>
              <TextInput style={styles.input} placeholder="Ej. Cerveza Poker" value={prodNombre} onChangeText={setProdNombre} />

              <Text style={styles.label}>Tipo de Medida:</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <TouchableOpacity style={[styles.botonTipo, !prodEsPesaje && styles.botonTipoActivo]} onPress={() => setProdEsPesaje(false)}>
                  <Text style={[styles.textoTipo, !prodEsPesaje && { color: 'white' }]}>Unitario (UND)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonTipo, prodEsPesaje && styles.botonTipoActivo]} onPress={() => setProdEsPesaje(true)}>
                  <Text style={[styles.textoTipo, prodEsPesaje && { color: 'white' }]}>Por Pesaje (KG)</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.label}>Precio Compra ($):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 2000"
                    keyboardType="numeric"
                    value={prodPrecioCosto}
                    onChangeText={setProdPrecioCosto}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.label}>Precio Venta ($):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 2500"
                    keyboardType="numeric"
                    value={prodPrecioVenta}
                    onChangeText={setProdPrecioVenta}
                  />
                </View>
              </View>

              {(prodPrecioCosto !== '' && prodPrecioVenta !== '') && (
                <View style={{ backgroundColor: margenFormulario >= 0 ? '#e8f8f5' : '#fdedec', padding: 8, borderRadius: 6, marginBottom: 12 }}>
                  <Text style={{ textAlign: 'center', fontWeight: 'bold', color: margenFormulario >= 0 ? '#117a65' : '#c0392b' }}>
                    Ganancia por {prodEsPesaje ? 'Kilo' : 'Unidad'}: ${margenFormulario.toFixed(0)}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>{prodEsPesaje ? 'Stock Disponible (Kilos):' : 'Stock Disponible (Unidades):'}</Text>
              <TextInput style={styles.input} placeholder={prodEsPesaje ? "Ej. 12.500" : "Ej. 24"} keyboardType="decimal-pad" value={prodStock} onChangeText={setProdStock} />

              <Text style={styles.label}>Categoría:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity style={[styles.chipCategoria, prodCategoria === null && styles.chipActivo]} onPress={() => setProdCategoria(null)}>
                  <Text style={[styles.textoChip, prodCategoria === null && styles.textoChipActivo]}>Sin categoría</Text>
                </TouchableOpacity>
                {categorias.map(cat => (
                  <TouchableOpacity
                    key={cat.id_categoria}
                    style={[styles.chipCategoria, prodCategoria === cat.id_categoria && styles.chipActivo]}
                    onPress={() => setProdCategoria(cat.id_categoria)}
                  >
                    <Text style={[styles.textoChip, prodCategoria === cat.id_categoria && styles.textoChipActivo]}>{cat.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Código de Barras (Opcional):</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                  placeholder="Vacío si es manual"
                  value={prodCodigo}
                  onChangeText={setProdCodigo}
                />
                <TouchableOpacity style={{ backgroundColor: '#2980b9', padding: 12, borderRadius: 8 }} onPress={() => abrirEscaner('registro')}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>📷 Leer</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.botonGuardarCliente} onPress={guardarProducto}>
                <Text style={styles.textoBoton}>Guardar Producto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalProductoVisible(false)}>
                <Text style={styles.textoCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: INFORME DETALLADO DE CIERRE DE CAJA */}
      <Modal visible={modalReporteCierre} animationType="slide" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { width: '92%' }]}>
            <Text style={styles.modalTitulo}>📊 Informe de Cierre de Caja</Text>
            {datosCierre && (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={{ textAlign: 'center', color: '#7f8c8d', marginBottom: 12, fontWeight: 'bold' }}>
                  Fecha y Hora: {datosCierre.fecha_hora_corte}
                </Text>

                <View style={{ backgroundColor: '#e8f8f5', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#a3e4d7' }}>
                  <Text style={{ fontSize: 14, color: '#117a65', fontWeight: 'bold', textAlign: 'center' }}>EFECTIVO FÍSICO A RETIRAR AHORA</Text>
                  <Text style={{ fontSize: 26, color: '#117a65', fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>
                    ${ datosCierre.nuevo_efectivo }
                  </Text>
                </View>

                <View style={styles.cajaResumen}>
                  <Text style={styles.subtituloReporte}>Desglose de Ingresos de Hoy</Text>
                  <View style={styles.filaReporte}>
                    <Text>Ventas en Efectivo ({datosCierre.cant_ventas_efectivo}):</Text>
                    <Text style={{ fontWeight: 'bold' }}>${datosCierre.ventas_efectivo}</Text>
                  </View>
                  <View style={styles.filaReporte}>
                    <Text>Abonos de Cartera ({datosCierre.cant_abonos}):</Text>
                    <Text style={{ fontWeight: 'bold' }}>${datosCierre.abonos_hoy}</Text>
                  </View>
                  <View style={styles.filaReporte}>
                    <Text style={{ color: '#7f8c8d' }}>Retirado en cortes previos hoy:</Text>
                    <Text style={{ color: '#7f8c8d' }}>-${datosCierre.cierres_previos}</Text>
                  </View>
                  <View style={[styles.filaReporte, { borderTopWidth: 1, borderColor: '#ddd', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={{ fontWeight: 'bold' }}>Total Efectivo del Día:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#27ae60' }}>${datosCierre.total_efectivo_dia}</Text>
                  </View>
                </View>

                <View style={styles.cajaResumen}>
                  <Text style={styles.subtituloReporte}>Créditos y Utilidad del Día</Text>
                  <View style={styles.filaReporte}>
                    <Text>Ventas Fiadas ({datosCierre.cant_ventas_credito}):</Text>
                    <Text style={{ fontWeight: 'bold', color: '#e67e22' }}>${datosCierre.ventas_credito}</Text>
                  </View>
                  {modoAdmin && (
                    <View style={[styles.filaReporte, { marginTop: 6, backgroundColor: '#ebf5fb', padding: 6, borderRadius: 6 }]}>
                      <Text style={{ fontWeight: 'bold', color: '#2980b9' }}>Ganancia Neta Estimada Hoy:</Text>
                      <Text style={{ fontWeight: 'bold', color: '#2980b9' }}>+${datosCierre.ganancia_neta_dia}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.botonGuardarCliente, { marginTop: 12 }]} onPress={() => setModalReporteCierre(false)}>
              <Text style={styles.textoBoton}>Entendido / Cerrar Informe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: HISTORIAL DETALLADO DE VENTAS */}
      <Modal visible={modalHistorialVentas} animationType="slide" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { width: '94%', maxHeight: '85%' }]}>
            <Text style={styles.modalTitulo}>🧾 Historial e Informe de Ventas</Text>
            <FlatList
              data={listaVentas}
              keyExtractor={item => item.id_venta.toString()}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No hay ventas registradas.</Text>}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 4, marginBottom: 6 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#2c3e50' }}>Factura #{item.id_venta}</Text>
                    <Text style={{ fontSize: 12, color: '#7f8c8d', fontWeight: 'bold' }}>📅 {item.fecha_hora}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#34495e' }}>👤 {item.cliente}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: item.metodo_pago === 'Crédito' ? '#e67e22' : '#27ae60' }}>
                      {item.metodo_pago}
                    </Text>
                  </View>

                  {item.productos && item.productos.map((prod, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                      <Text style={{ fontSize: 13, color: '#555' }}>
                        • {prod.nombre} ({prod.cantidad} {prod.unidad || 'und'} x ${prod.precio_unitario || ''})
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>${prod.subtotal}</Text>
                    </View>
                  ))}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#ddd', paddingTop: 6, marginTop: 6 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total Factura:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#27ae60' }}>${item.total}</Text>
                  </View>

                  {modoAdmin && item.ganancia && (
                    <Text style={{ textAlign: 'right', fontSize: 12, color: '#2980b9', fontWeight: 'bold', marginTop: 2 }}>
                      Ganancia de esta venta: +${item.ganancia}
                    </Text>
                  )}
                </View>
              )}
            />
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalHistorialVentas(false)}>
              <Text style={styles.textoCancelar}>Cerrar Historial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CANTIDAD O PESO AL VENDER */}
      <Modal visible={modalCantidadVisible} animationType="fade" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>{productoParaCantidad?.nombre}</Text>
            <Text style={{ textAlign: 'center', marginBottom: 10, color: '#555' }}>
              Precio: ${productoParaCantidad?.precio_detal} | Disp: {productoParaCantidad ? formatearStock(productoParaCantidad) : ''}
            </Text>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
              {productoParaCantidad?.permite_decimales ? 'Cantidad en Kilos (ej. 0.5 o 1.25):' : 'Cantidad de Unidades:'}
            </Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={cantidadInput} onChangeText={setCantidadInput} autoFocus={true} />
            <TouchableOpacity style={styles.botonGuardarCliente} onPress={confirmarAgregarConCantidad}>
              <Text style={styles.textoBoton}>Añadir al Carrito</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalCantidadVisible(false)}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREAR CATEGORÍA */}
      <Modal visible={modalCategoriaVisible} animationType="fade" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Nueva Categoría</Text>
            <TextInput style={styles.input} placeholder="Ej. Bebidas, Lácteos..." value={nuevaCategoriaNombre} onChangeText={setNuevaCategoriaNombre} />
            <TouchableOpacity style={styles.botonGuardarCliente} onPress={crearNuevaCategoria}>
              <Text style={styles.textoBoton}>Crear Categoría</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalCategoriaVisible(false)}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CÁMARA ESCÁNER */}
      <Modal visible={modalEscanerVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={escaneadoBloqueado ? undefined : alLeerCodigoBarras} />
          <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20 }}>
            <Text style={{ color: 'white', textAlign: 'center', marginBottom: 15, fontSize: 16, fontWeight: 'bold' }}>
              Apunta al código de barras del producto
            </Text>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalEscanerVisible(false)}>
              <Text style={styles.textoCancelar}>Cerrar Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: DETALLE DE LA VENTA (CARRITO) */}
      <Modal visible={modalDetalleVenta} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Detalle de la Venta</Text>
            <FlatList
              data={carrito}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.nombre}</Text>
                    <Text style={{ color: '#7f8c8d' }}>
                      {item.cantidad} {item.permite_decimales ? 'kg' : 'und'} x ${item.precio_detal} = ${(item.cantidad * item.precio_detal).toFixed(0)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                    onPress={() => setCarrito(carrito.filter(p => p.id_producto !== item.id_producto))}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15, borderTopWidth: 2, borderTopColor: '#2c3e50', paddingTop: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Total a Cobrar:</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#27ae60' }}>${dineroTotal.toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#3498db', padding: 15, borderRadius: 8, marginRight: 5, alignItems: 'center' }}
                onPress={() => { setMetodoPago('Efectivo'); ejecutarVenta(null, 'Efectivo'); }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cobrar Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#e67e22', padding: 15, borderRadius: 8, marginLeft: 5, alignItems: 'center' }}
                onPress={() => { setMetodoPago('Crédito'); setModalDetalleVenta(false); setModalVisible(true); }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Fiar a Vecino</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ backgroundColor: '#95a5a6', padding: 15, borderRadius: 8, marginTop: 10, alignItems: 'center' }} onPress={() => setModalDetalleVenta(false)}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ELEGIR CLIENTE PARA FIADO */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            {creandoCliente ? (
              <View style={{ width: '100%' }}>
                <Text style={styles.modalTitulo}>Registrar Vecino</Text>
                <TextInput style={styles.input} placeholder="Nombre" value={nuevoNombre} onChangeText={setNuevoNombre} />
                <TextInput style={styles.input} placeholder="Apellido" value={nuevoApellido} onChangeText={setNuevoApellido} />
                <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={nuevoTelefono} onChangeText={setNuevoTelefono} />
                <TouchableOpacity style={styles.botonGuardarCliente} onPress={registrarNuevoCliente}><Text style={styles.textoBoton}>Guardar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => setCreandoCliente(false)}><Text style={styles.textoCancelar}>Volver</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <Text style={styles.modalTitulo}>¿A quién le vas a fiar?</Text>
                <TouchableOpacity style={styles.botonNuevoCliente} onPress={() => setCreandoCliente(true)}><Text style={styles.textoNuevoCliente}>+ Registrar Vecino</Text></TouchableOpacity>
                <FlatList
                  data={clientes}
                  keyExtractor={c => c.id_cliente.toString()}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.botonCliente} onPress={() => ejecutarVenta(item.id_cliente, 'Crédito')}>
                      <Text style={styles.textoCliente}>{item.nombre_completo}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalVisible(false)}><Text style={styles.textoCancelar}>Cancelar</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: ABONOS */}
      <Modal visible={modalAbonoVisible} animationType="fade" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Abono de {clienteAbono?.nombre_completo}</Text>
            <Text style={{ textAlign: 'center', marginBottom: 15 }}>Deuda Actual: ${clienteAbono?.deuda_actual}</Text>
            <TextInput style={styles.input} placeholder="Monto a abonar ($)" keyboardType="numeric" value={montoAbono} onChangeText={setMontoAbono} />
            <TouchableOpacity style={styles.botonGuardarCliente} onPress={registrarAbono}><Text style={styles.textoBoton}>Confirmar Pago</Text></TouchableOpacity>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => { setModalAbonoVisible(false); setMontoAbono(''); }}><Text style={styles.textoCancelar}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: DETALLE DEUDAS EN CARTERA */}
      <Modal visible={modalHistorialVisible} animationType="slide" transparent={true}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Facturas Pendientes</Text>
            <Text style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>{clienteSeleccionado?.nombre_completo}</Text>
            <FlatList
              data={deudasDetalladas}
              keyExtractor={item => item.id_cuenta.toString()}
              style={{ maxHeight: 300, width: '100%' }}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' }}>
                  <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>Factura de Venta #{item.id_venta}</Text>
                  <Text>Capital: ${item.saldo_pendiente} | Interés (10%): ${item.interes_acumulado}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#e74c3c', marginTop: 3 }}>Total Factura: ${item.total}</Text>
                </View>
              )}
            />
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalHistorialVisible(false)}><Text style={styles.textoCancelar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f0f0', paddingTop: 45, paddingHorizontal: 15 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  menuSuperior: { flexDirection: 'row', marginBottom: 10, backgroundColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  botonMenu: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  menuActivo: { backgroundColor: '#3498db' },
  textoMenu: { fontSize: 15, color: '#555', fontWeight: 'bold' },
  textoMenuActivo: { color: 'white' },
  chipCategoria: { backgroundColor: '#e0e6ed', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipActivo: { backgroundColor: '#2c3e50' },
  textoChip: { color: '#333', fontWeight: '600' },
  textoChipActivo: { color: 'white' },
  botonAccionSuperior: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  textoBotonBlanco: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  tarjeta: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoProducto: { flex: 1, paddingRight: 10 },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  precio: { fontSize: 15, color: '#27ae60', marginTop: 2, fontWeight: '600' },
  stock: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  botonAgregar: { backgroundColor: '#3498db', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  textoBoton: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  contenedorBarra: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  barraCarrito: { backgroundColor: '#2c3e50', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  textoCarrito: { color: 'white', fontSize: 13 },
  totalCarrito: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCaja: { backgroundColor: 'white', width: '88%', borderRadius: 15, padding: 20, elevation: 5 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#2c3e50' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#34495e', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 15, backgroundColor: '#fafafa' },
  botonTipo: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#3498db', alignItems: 'center', borderRadius: 6, marginHorizontal: 3 },
  botonTipoActivo: { backgroundColor: '#3498db' },
  textoTipo: { fontWeight: 'bold', color: '#3498db' },
  botonGuardarCliente: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 8, marginBottom: 5 },
  botonCancelar: { marginTop: 10, backgroundColor: '#e74c3c', padding: 12, borderRadius: 8, alignItems: 'center' },
  textoCancelar: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  botonCliente: { backgroundColor: '#f8f9fa', padding: 14, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  textoCliente: { fontSize: 16, color: '#333' },
  botonNuevoCliente: { backgroundColor: '#f39c12', padding: 12, borderRadius: 8, marginBottom: 12 },
  textoNuevoCliente: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 15 },
  cajaResumen: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  subtituloReporte: { fontWeight: 'bold', fontSize: 14, color: '#2c3e50', marginBottom: 6, borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 4 },
  filaReporte: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }
});