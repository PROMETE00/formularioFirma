// Importamos los módulos necesarios de Firebase
import { db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos de desencriptación
    const decryptForm = document.getElementById('decryptForm');
    const searchType = document.getElementById('searchType');
    const searchLabel = document.getElementById('searchLabel');
    const searchValue = document.getElementById('searchValue');
    const searchResult = document.getElementById('searchResult');
    const searchStatus = document.getElementById('searchStatus');
    
    // Textos para cada tipo de búsqueda
    const searchLabels = {
        'id': 'ID de Registro',
        'nombre': 'Nombre Completo',
        'email': 'Correo Electrónico'
    };
    
    // Placeholders para cada tipo de búsqueda
    const searchPlaceholders = {
        'id': 'Ingrese el ID del registro (ej: abc123)',
        'nombre': 'Ingrese el nombre completo (ej: Juan Pérez)',
        'email': 'Ingrese el correo electrónico (ej: ejemplo@correo.com)'
    };
    
    // Cambiar tipo de búsqueda
    searchType.addEventListener('change', function() {
        const type = this.value;
        
        // Actualizar label y placeholder
        searchLabel.textContent = searchLabels[type];
        searchValue.placeholder = searchPlaceholders[type];
        
        // Limpiar campo de búsqueda
        searchValue.value = '';
    });
    
    // Manejar búsqueda
    decryptForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const type = searchType.value;
        const value = searchValue.value.trim();
        
        if (!value) {
            showAlert(`Por favor, ingrese un ${searchLabels[type].toLowerCase()} para buscar.`, "error", searchStatus);
            return;
        }
        
        try {
            let query;
            
            if (type === 'id') {
                // Buscar por ID de documento
                const docRef = doc(db, 'firmas', value);
                const docSnap = await getDoc(docRef);
                
                if (!docSnap.exists()) {
                    throw new Error("No se encontró el documento");
                }
                
                processRecord({ id: docSnap.id, ...docSnap.data() });
                return;
                
            } else if (type === 'nombre') {
                query = query(collection(db, 'firmas'), where('nombre', '==', value));
            } else if (type === 'email') {
                query = query(collection(db, 'firmas'), where('email', '==', value));
            }
            
            const querySnapshot = await getDocs(query);
            
            if (querySnapshot.empty) {
                showAlert(`No se encontraron registros con el ${searchLabels[type].toLowerCase()} proporcionado.`, "error", searchStatus);
                searchResult.classList.add('hidden');
                return;
            }
            
            // Procesar el primer resultado
            querySnapshot.forEach(doc => {
                processRecord({ id: doc.id, ...doc.data() });
                return; // Solo mostramos el primer resultado
            });
            
        } catch (error) {
            console.error("Error al buscar en Firestore: ", error);
            showAlert("Error al buscar en la base de datos.", "error", searchStatus);
        }
    });
    
    function processRecord(record) {
        // Desencriptar la firma
        let signatureImage = "";
        try {
            const bytes = CryptoJS.AES.decrypt(record.firma, "claveSecretaFirma123");
            signatureImage = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!signatureImage.startsWith('data:image')) {
                throw new Error("Firma corrupta");
            }
        } catch (e) {
            showAlert("Error al desencriptar la firma. La firma no pudo ser recuperada correctamente.", "error", searchStatus);
            return;
        }
        
        // Mostrar resultados
        document.getElementById('resultId').textContent = record.id;
        document.getElementById('resultNombre').textContent = record.nombre;
        document.getElementById('resultEmail').textContent = record.email;
        
        // Formatear fecha de Firestore
        let fechaStr = "Fecha no disponible";
        if (record.fecha) {
            const fecha = record.fecha.toDate();
            fechaStr = fecha.toLocaleString('es-ES');
        }
        document.getElementById('resultFecha').textContent = fechaStr;
        
        document.getElementById('resultSignatureImg').src = signatureImage;
        
        searchResult.classList.remove('hidden');
        searchStatus.classList.add('hidden');
        
        showAlert(`Firma recuperada correctamente mediante ${searchLabels[searchType.value].toLowerCase()}.`, "success", searchStatus);
    }
    
    // Descargar firma recuperada
    document.getElementById('downloadRecovered').addEventListener('click', function() {
        const imgSrc = document.getElementById('resultSignatureImg').src;
        const nombre = document.getElementById('resultNombre').textContent;
        
        const link = document.createElement('a');
        link.href = imgSrc;
        link.download = `firma_${nombre.replace(/\s+/g, '_')}.png`;
        link.click();
        
        showAlert("Firma descargada como imagen.", "success", searchStatus);
    });
    
    // Nueva búsqueda
    document.getElementById('newSearch').addEventListener('click', function() {
        decryptForm.reset();
        searchResult.classList.add('hidden');
        searchStatus.classList.add('hidden');
        
        // Restablecer el placeholder según la selección actual
        searchValue.placeholder = searchPlaceholders[searchType.value];
    });
    
    // Función auxiliar para mostrar alertas
    function showAlert(message, type, element) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.classList.remove('hidden');
        
        setTimeout(() => {
            element.classList.add('hidden');
        }, 3000);
    }
    
    // Inicializar el placeholder según la selección por defecto
    searchValue.placeholder = searchPlaceholders[searchType.value];
});