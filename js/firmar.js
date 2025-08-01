// Importaciones corregidas
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
    // Configuración del canvas de firma
    const canvas = document.getElementById('signatureCanvas');
    const clearButton = document.getElementById('clearButton');
    const undoButton = document.getElementById('undoButton');
    const form = document.getElementById('signatureForm');
    const signatureData = document.getElementById('signatureData');
    const preview = document.getElementById('preview');
    const saveToDB = document.getElementById('saveToDB');
    const dbStatus = document.getElementById('dbStatus');
    
    // Configurar el canvas
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        canvas.style.width = canvas.offsetWidth + "px";
        canvas.style.height = canvas.offsetHeight + "px";
    }
    
    resizeCanvas();
    
    // Crear instancia de SignaturePad
    const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        velocityFilterWeight: 0.7,
        minWidth: 0.5,
        maxWidth: 2.5
    });
    
    let signatureHistory = [];
    
    // Redimensionar cuando cambie el tamaño de ventana
    window.addEventListener("resize", resizeCanvas);
    
    // Guardar historial
    signaturePad.onBegin = function() {
        signatureHistory.push(signaturePad.toDataURL());
    };
    
    // Prevenir menú contextual
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Limpiar firma
    clearButton.addEventListener('click', function() {
        signaturePad.clear();
        signatureHistory = [];
    });
    
    // Deshacer
    undoButton.addEventListener('click', function() {
        if (signatureHistory.length > 0) {
            signatureHistory.pop();
            signaturePad.clear();
            if (signatureHistory.length > 0) {
                signaturePad.fromDataURL(signatureHistory[signatureHistory.length - 1]);
            }
        }
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!nombre || !email) {
            showAlert("Por favor, complete todos los campos obligatorios.", "error", dbStatus);
            return;
        }
        
        if (signaturePad.isEmpty()) {
            showAlert("Por favor, proporcione su firma.", "error", dbStatus);
            return;
        }
        
        const dataURL = signaturePad.toDataURL();
        signatureData.value = dataURL;
        
        showPreview(nombre, email, dataURL);
    });
    
    // Mostrar vista previa
    function showPreview(nombre, email, firmaURL) {
        document.getElementById('previewNombre').textContent = nombre;
        document.getElementById('previewEmail').textContent = email;
        document.getElementById('previewFecha').textContent = new Date().toLocaleString('es-ES');
        document.getElementById('previewSignatureImg').src = firmaURL;
        
        form.style.display = 'none';
        preview.classList.remove('hidden');
    }
    
    // Nuevo formulario
    document.getElementById('newForm').addEventListener('click', function() {
        form.reset();
        signaturePad.clear();
        signatureHistory = [];
        form.style.display = 'block';
        preview.classList.add('hidden');
        dbStatus.classList.add('hidden');
    });
    
    // Descargar archivo
    document.getElementById('downloadPDF').addEventListener('click', function() {
        const nombre = document.getElementById('previewNombre').textContent;
        const email = document.getElementById('previewEmail').textContent;
        const fecha = document.getElementById('previewFecha').textContent;
        const firmaURL = document.getElementById('previewSignatureImg').src;
        
        const element = document.createElement('a');
        const fileContent = `DOCUMENTO FIRMADO DIGITALMENTE
========================

Nombre: ${nombre}
Email: ${email}
Fecha: ${fecha}

Firma Digital: ${firmaURL}

Este documento ha sido firmado digitalmente.`;
        
        const file = new Blob([fileContent], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `documento_firmado_${nombre.replace(/\s+/g, '_')}.txt`;
        element.click();
        
        showAlert("Documento descargado correctamente.", "success", dbStatus);
    });
    
    // Guardar en Firestore
    saveToDB.addEventListener('click', async function() {
        const nombre = document.getElementById('previewNombre').textContent;
        const email = document.getElementById('previewEmail').textContent;
        const firmaURL = document.getElementById('previewSignatureImg').src;
        
        // Encriptar la firma
        const encryptedSignature = CryptoJS.AES.encrypt(firmaURL, "claveSecretaFirma123").toString();
        
        try {
            // Agregar documento a Firestore
            const docRef = await addDoc(collection(db, 'firmas'), {
                nombre: nombre,
                email: email,
                firma: encryptedSignature,
                fecha: serverTimestamp()
            });
            
            dbStatus.innerHTML = `Registro guardado correctamente. ID: <strong>${docRef.id}</strong>`;
            dbStatus.className = 'alert alert-success';
            dbStatus.classList.remove('hidden');
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
            showAlert("Error al guardar en la base de datos.", "error", dbStatus);
        }
    });
    
    // Funciones auxiliares
    function showAlert(message, type, element) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.classList.remove('hidden');
        
        setTimeout(() => {
            element.classList.add('hidden');
        }, 3000);
    }
});