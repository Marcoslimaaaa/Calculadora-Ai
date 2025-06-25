import { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:5000/api'

function App() {
  const [calculos, setCalculos] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo_piscina: 'retangular',
    comprimento: '',
    largura: '',
    profundidade: '',
    ladoAComp: '',
    ladoBComp: '',
    ladoCLarg: '',
    ladoDLarg: '',
    profundidadeFora: '',
    fundoManual: '',
    paredesManual: '',
    material: 'vinil',
    fornecedor: 'Acqualiner',
    prainha: false,
    prainhaComp: '',
    prainhaLarg: '',
    prainhaProf: ''
  })
  const [resultadoArea, setResultadoArea] = useState(null)

  const fornecedores = ['Acqualiner', 'Sansui', 'Sipatex', 'Locomotiva/Aqualona']

  useEffect(() => {
    carregarCalculos()
  }, [])

  const carregarCalculos = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/calculos`)
      setCalculos(response.data)
    } catch (error) {
      console.error('Erro ao carregar cálculos:', error)
      toast.error('Erro ao carregar histórico de cálculos')
    } finally {
      setLoading(false)
    }
  }

  const calcularArea = () => {
    const { tipo_piscina, comprimento, largura, profundidade, ladoAComp, ladoBComp, ladoCLarg, ladoDLarg, profundidadeFora, prainha, prainhaComp, prainhaLarg, prainhaProf, fundoManual, paredesManual } = formData
    let areaFundo = 0
    let areaParedes = 0
    let areaTotal = 0
    if (tipo_piscina === 'retangular') {
      if (!comprimento || !largura || !profundidade) {
        toast.error('Preencha todas as dimensões')
        return null
      }
      const comp = parseFloat(comprimento)
      const larg = parseFloat(largura)
      const prof = parseFloat(profundidade)
      areaFundo = comp * larg
      areaParedes = 2 * (comp * prof) + 2 * (larg * prof)
      areaTotal = areaFundo + areaParedes
    } else if (tipo_piscina === 'circular') {
      if (!comprimento || !profundidade) {
        toast.error('Preencha todas as dimensões')
        return null
      }
      const raio = parseFloat(comprimento) / 2
      const prof = parseFloat(profundidade)
      areaFundo = Math.PI * raio * raio
      areaParedes = 2 * Math.PI * raio * prof
      areaTotal = areaFundo + areaParedes
    } else if (tipo_piscina === 'fora_esquadro') {
      if (!ladoAComp || !ladoBComp || !ladoCLarg || !ladoDLarg || !profundidadeFora) {
        toast.error('Preencha todos os lados e profundidade')
        return null
      }
      const a = parseFloat(ladoAComp)
      const b = parseFloat(ladoBComp)
      const c = parseFloat(ladoCLarg)
      const d = parseFloat(ladoDLarg)
      const prof = parseFloat(profundidadeFora)
      // Área do fundo (aproximação: quadrilátero irregular)
      const s = (a + b + c + d) / 2
      areaFundo = Math.sqrt((s - a) * (s - b) * (s - c) * (s - d))
      areaParedes = (a + b + c + d) * prof
      areaTotal = areaFundo + areaParedes
    }
    // Prainha/SPA externo
    if (prainha && prainhaComp && prainhaLarg && prainhaProf) {
      const comp = parseFloat(prainhaComp)
      const larg = parseFloat(prainhaLarg)
      const prof = parseFloat(prainhaProf)
      areaFundo += comp * larg
      areaParedes += 2 * (comp * prof) + 2 * (larg * prof)
      areaTotal = areaFundo + areaParedes
    }
    // Se usuário preencher manualmente, sobrescreve
    if (fundoManual) areaFundo = parseFloat(fundoManual)
    if (paredesManual) areaParedes = parseFloat(paredesManual)
    areaTotal = areaFundo + areaParedes
    return { areaTotal, areaFundo, areaParedes }
  }

  const calcularBobinas = (areaTotal) => {
    if (formData.material === 'pastilha') return 0
    
    // Bobina padrão: 1,40m x 50m = 70m²
    const areaBobina = 1.4 * 50
    return Math.ceil(areaTotal / areaBobina)
  }

  const calcularPerdas = (areaTotal, bobinas) => {
    if (formData.material === 'pastilha') return { m2: 0, percentual: 0 }
    
    const areaBobina = 1.4 * 50
    const areaTotalBobinas = bobinas * areaBobina
    const perdasM2 = areaTotalBobinas - areaTotal
    const perdasPercentual = (perdasM2 / areaTotalBobinas) * 100
    
    return { m2: perdasM2, percentual: perdasPercentual }
  }

  const handleCalcular = () => {
    const resultadoAreaTemp = calcularArea()
    if (!resultadoAreaTemp) return
    const { areaTotal, areaFundo, areaParedes } = resultadoAreaTemp
    setResultadoArea(resultadoAreaTemp)
    const bobinas = calcularBobinas(areaTotal)
    const perdas = calcularPerdas(areaTotal, bobinas)
    const resultado = {
      tipo_piscina: formData.tipo_piscina,
      dimensoes: {
        ...formData
      },
      material: formData.material,
      area_total: areaTotal,
      area_fundo: areaFundo,
      area_paredes: areaParedes,
      bobinas_necessarias: bobinas,
      perdas_m2: perdas.m2,
      perdas_percentual: perdas.percentual,
      fornecedor: formData.fornecedor
    }
    toast.success(`Cálculo realizado! Área: ${areaTotal.toFixed(2)} m²`)
    salvarCalculo(resultado)
  }

  const salvarCalculo = async (calculo) => {
    try {
      await axios.post(`${API_BASE_URL}/calculos`, calculo)
      toast.success('Cálculo salvo com sucesso!')
      carregarCalculos()
    } catch (error) {
      console.error('Erro ao salvar cálculo:', error)
      toast.error('Erro ao salvar cálculo')
    }
  }

  const exportarPDF = async (calculo) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/exportar-pdf`, { calculo }, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `calculo_piscina_${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('PDF exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          Calculadora de Piscinas
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Cálculo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Novo Cálculo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Piscina
                </label>
                <select
                  value={formData.tipo_piscina}
                  onChange={(e) => setFormData({...formData, tipo_piscina: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="retangular">Retangular</option>
                  <option value="circular">Circular</option>
                  <option value="fora_esquadro">Fora de esquadro (4 lados)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.tipo_piscina === 'circular' ? 'Diâmetro' : 'Comprimento'} (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.comprimento}
                    onChange={(e) => setFormData({...formData, comprimento: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                </div>
                
                {formData.tipo_piscina === 'retangular' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Largura (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.largura}
                      onChange={(e) => setFormData({...formData, largura: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profundidade (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.profundidade}
                    onChange={(e) => setFormData({...formData, profundidade: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                </div>
              </div>

              {formData.tipo_piscina === 'fora_esquadro' && (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lado A (comprimento)</label>
                    <input type="number" step="0.1" value={formData.ladoAComp} onChange={e => setFormData({...formData, ladoAComp: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lado B (comprimento)</label>
                    <input type="number" step="0.1" value={formData.ladoBComp} onChange={e => setFormData({...formData, ladoBComp: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lado C (largura)</label>
                    <input type="number" step="0.1" value={formData.ladoCLarg} onChange={e => setFormData({...formData, ladoCLarg: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lado D (largura)</label>
                    <input type="number" step="0.1" value={formData.ladoDLarg} onChange={e => setFormData({...formData, ladoDLarg: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                </div>
              )}
              {formData.tipo_piscina === 'fora_esquadro' && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Profundidade (m)</label>
                  <input type="number" step="0.1" value={formData.profundidadeFora} onChange={e => setFormData({...formData, profundidadeFora: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material
                  </label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vinil">Vinil</option>
                    <option value="pastilha">Pastilha</option>
                    <option value="lona">Lona</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornecedor
                  </label>
                  <select
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {fornecedores.map(fornecedor => (
                      <option key={fornecedor} value={fornecedor}>{fornecedor}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="inline-flex items-center">
                  <input type="checkbox" checked={formData.prainha} onChange={e => setFormData({...formData, prainha: e.target.checked})} className="mr-2" />
                  Adicionar prainha/SPA externo
                </label>
              </div>
              {formData.prainha && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Comp. (m)</label>
                    <input type="number" step="0.1" value={formData.prainhaComp} onChange={e => setFormData({...formData, prainhaComp: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Larg. (m)</label>
                    <input type="number" step="0.1" value={formData.prainhaLarg} onChange={e => setFormData({...formData, prainhaLarg: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prof. (m)</label>
                    <input type="number" step="0.1" value={formData.prainhaProf} onChange={e => setFormData({...formData, prainhaProf: e.target.value})} className="w-full p-1 border border-gray-300 rounded-md" />
                  </div>
                </div>
              )}

              <button
                onClick={handleCalcular}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Calcular
              </button>
            </div>
          </div>

          {/* Histórico de Cálculos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Histórico</h2>
            
            {loading ? (
              <p className="text-gray-500">Carregando...</p>
            ) : calculos.length === 0 ? (
              <p className="text-gray-500">Nenhum cálculo encontrado</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {calculos.map((calculo) => {
                  let dimensoes = {};
                  try {
                    dimensoes = JSON.parse(calculo.dimensoes);
                  } catch {}
                  return (
                    <div key={calculo.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{calculo.tipo_piscina} - {calculo.material}</h3>
                        <button
                          onClick={() => exportarPDF(calculo)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Exportar PDF
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Área total: {calculo.area_total?.toFixed(2)} m²
                        {calculo.bobinas_necessarias > 0 && ` | Bobinas: ${calculo.bobinas_necessarias}`}
                      </p>
                      {('area_fundo' in calculo || dimensoes.fundoManual) && (
                        <p className="text-xs text-gray-500">Fundo: {calculo.area_fundo?.toFixed(2) || dimensoes.fundoManual} m²</p>
                      )}
                      {('area_paredes' in calculo || dimensoes.paredesManual) && (
                        <p className="text-xs text-gray-500">Paredes: {calculo.area_paredes?.toFixed(2) || dimensoes.paredesManual} m²</p>
                      )}
                      {calculo.tipo_piscina === 'fora_esquadro' && (
                        <div className="text-xs text-gray-500">
                          <div>Lado A (comp): {dimensoes.ladoAComp} m</div>
                          <div>Lado B (comp): {dimensoes.ladoBComp} m</div>
                          <div>Lado C (larg): {dimensoes.ladoCLarg} m</div>
                          <div>Lado D (larg): {dimensoes.ladoDLarg} m</div>
                          <div>Profundidade: {dimensoes.profundidadeFora} m</div>
                        </div>
                      )}
                      {dimensoes.prainha && (
                        <div className="text-xs text-gray-500">
                          <div>Prainha/SPA: {dimensoes.prainhaComp} x {dimensoes.prainhaLarg} x {dimensoes.prainhaProf} m</div>
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        Fornecedor: {calculo.fornecedor}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(calculo.data_criacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ToastContainer position="bottom-right" />

      {resultadoArea && (
        <div className="bg-green-100 border border-green-400 text-green-800 rounded p-4 mb-4">
          <div><b>Área do fundo:</b> {resultadoArea.areaFundo.toFixed(2)} m²</div>
          <div><b>Área das paredes:</b> {resultadoArea.areaParedes.toFixed(2)} m²</div>
          <div><b>Área total:</b> {resultadoArea.areaTotal.toFixed(2)} m²</div>
        </div>
      )}
    </div>
  )
}

export default App 