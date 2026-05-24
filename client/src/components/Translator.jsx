import React, { useState, useRef, useEffect } from 'react';

const Translator = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [status, setStatus] = useState('Idle'); // Idle, Recording, Processing
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await sendAudioChunk(event.data);
        }
      };

      // Record in 4 second chunks
      mediaRecorder.start();
      setStatus('Recording');
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          // mediaRecorder.start() will be called again by the handler or manually
          // But MediaRecorder.stop() doesn't automatically restart.
          // We need to restart it immediately to avoid missing audio.
          setTimeout(() => {
            if (isRecording) {
              mediaRecorderRef.current.start();
            }
          }, 100);
        }
      }, 4000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure you have given permission.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setStatus('Idle');
  };

  const sendAudioChunk = async (blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'chunk.webm');

    try {
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      setTranslations(prev => [...prev, data]);
    } catch (err) {
      console.error('Error sending audio chunk:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 text-gray-900 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-indigo-600">Traductor Darija → Español</h1>
          <p className="text-gray-500">Clases de Religión en Tiempo Real</p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-8 py-4 rounded-full font-semibold text-white transition-all transform hover:scale-105 active:scale-95 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200'
                : 'bg-indigo-500 hover:bg-indigo-600 ring-4 ring-indigo-200'
            }`}
          >
            {isRecording ? '⏹ Detener' : '⏺ Empezar Traducción'}
          </button>
        </div>

        <div className="flex justify-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'Recording' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'
          }`}>
            {status === 'Recording' ? '● Grabando' : 'Esperando...'}
          </span>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
          {translations.length === 0 && (
            <p className="text-center text-gray-400 italic">Las traducciones aparecerán aquí...</p>
          )}
          {translations.map((t, i) => (
            <div key={i} className="p-4 bg-white rounded-lg shadow-sm border-l-4 border-indigo-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-2xl font-medium text-gray-800 leading-relaxed">
                {t.spanish}
              </p>
              <p className="text-sm text-gray-400 mt-2 font-arabic text-right">
                {t.arabic}
              </p>
            </div>
          ))}
          {translations.length > 0 && (
            <div className="h-1" />
          )}
        </div>
      </div>

      <style>{`
        .font-arabic {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
        }
      `}</style>
    </div>
  );
};

export default Translator;
