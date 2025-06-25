import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar banco de dados SQLite
const db = new Database('calculos.db');

// Criar tabela se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS calculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_piscina TEXT NOT NULL,
    dimensoes TEXT NOT NULL,
    material TEXT NOT NULL,
    area_total REAL NOT NULL,
    bobinas_necessarias INTEGER,
    perdas_m2 REAL,
    perdas_percentual REAL,
    fornecedor TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Endpoints da API

// GET - Listar todos os cálculos
app.get('/api/calculos', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM calculos ORDER BY data_criacao DESC');
    const calculos = stmt.all();
    res.json(calculos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cálculos' });
  }
});

// GET - Buscar cálculo por ID
app.get('/api/calculos/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM calculos WHERE id = ?');
    const calculo = stmt.get(req.params.id);
    
    if (!calculo) {
      return res.status(404).json({ error: 'Cálculo não encontrado' });
    }
    
    res.json(calculo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cálculo' });
  }
});

// POST - Salvar novo cálculo
app.post('/api/calculos', (req, res) => {
  try {
    const {
      tipo_piscina,
      dimensoes,
      material,
      area_total,
      bobinas_necessarias,
      perdas_m2,
      perdas_percentual,
      fornecedor
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO calculos (
        tipo_piscina, dimensoes, material, area_total, 
        bobinas_necessarias, perdas_m2, perdas_percentual, fornecedor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      tipo_piscina,
      JSON.stringify(dimensoes),
      material,
      area_total,
      bobinas_necessarias,
      perdas_m2,
      perdas_percentual,
      fornecedor
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Cálculo salvo com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar cálculo' });
  }
});

// POST - Gerar PDF
app.post('/api/exportar-pdf', (req, res) => {
  try {
    const { calculo } = req.body;
    
    const doc = new PDFDocument();
    const filename = `calculo_piscina_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, 'temp', filename);
    
    // Criar pasta temp se não existir
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }
    
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Conteúdo do PDF
    doc.fontSize(20).text('Relatório de Cálculo - Piscina', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tipo de Piscina: ${calculo.tipo_piscina}`);
    doc.text(`Material: ${calculo.material}`);
    doc.text(`Área Total: ${calculo.area_total} m²`);
    doc.text(`Bobinas Necessárias: ${calculo.bobinas_necessarias || 'N/A'}`);
    doc.text(`Perdas: ${calculo.perdas_m2} m² (${calculo.perdas_percentual}%)`);
    if (calculo.fornecedor) {
      doc.text(`Fornecedor: ${calculo.fornecedor}`);
    }
    doc.moveDown();
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    
    doc.end();
    
    stream.on('finish', () => {
      res.download(filepath, filename, (err) => {
        // Remover arquivo temporário após download
        fs.unlink(filepath, () => {});
      });
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API da Calculadora de Piscinas funcionando!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`API disponível em: http://localhost:${PORT}/api`);
}); 