/**
 * reservas.js
 * Lógica compartilhada de reservas do professor.
 *
 * Como funciona (sem backend):
 * 1. Na tela de escolha da sala/lab/gabinete, o item escolhido é salvo em
 *    sessionStorage("salaSelecionada").
 * 2. No Passo 02 (formulário), ao enviar, os dados do formulário + a
 *    categoria (lida do próprio card ".category-card h3") são guardados em
 *    sessionStorage("senai_nova_reserva") - é uma reserva "rascunho".
 * 3. Na tela de confirmação (Passo 03), o rascunho é promovido para a lista
 *    definitiva em localStorage("senai_reservas_professor") com status
 *    "aguardando", um id único e a data de criação.
 * 4. As telas "Início" e "Reservas" leem essa lista para exibir os cards
 *    com o status (Aguardando / Aprovada / Negado) e o botão "Cancelar Reserva".
 *
 * OBS: como ainda não existe um backend de aprovação, toda reserva nova
 * entra como "aguardando". Os status "aprovada" e "negado" já são
 * totalmente suportados pela interface (cores, filtros etc.) e passarão a
 * aparecer assim que a parte de aprovação do coordenador for integrada.
 */

const ReservasApp = (() => {
  const STORAGE_KEY = 'senai_reservas_professor';
  const TEMP_KEY = 'senai_nova_reserva';
  const SALA_KEY = 'salaSelecionada';

  function _uid() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function getReservas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler reservas:', e);
      return [];
    }
  }

  function _saveReservas(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) {
      console.error('Erro ao salvar reservas:', e);
      return false;
    }
  }

  /**
   * Lê os campos do formulário do Passo 02 e guarda um "rascunho" da
   * reserva em sessionStorage, para ser confirmado na tela seguinte.
   */
  function stageReserva(formEl) {
    const categoriaEl = document.querySelector('.category-card h3');
    const categoria = categoriaEl ? categoriaEl.textContent.trim() : 'Reserva';
    const item = sessionStorage.getItem(SALA_KEY) || categoria;

    const getVal = (id) => {
      const el = formEl.querySelector('#' + id);
      return el ? el.value.trim() : '';
    };

    const rascunho = {
      categoria,
      item,
      professor: getVal('nomeProfessor'),
      curso: getVal('curso'),
      motivo: getVal('motivo'),
      data: getVal('data'),
      horaEntrada: getVal('horaEntrada'),
      horaSaida: getVal('horaSaida'),
    };

    sessionStorage.setItem(TEMP_KEY, JSON.stringify(rascunho));
  }

  /**
   * Deve ser chamada na tela de confirmação (Passo 03). Promove o
   * rascunho guardado em sessionStorage para a lista definitiva de
   * reservas, evitando duplicar caso a página seja recarregada.
   */
  function commitStagedReserva() {
    const raw = sessionStorage.getItem(TEMP_KEY);
    if (!raw) return null;

    let rascunho;
    try {
      rascunho = JSON.parse(raw);
    } catch (e) {
      sessionStorage.removeItem(TEMP_KEY);
      return null;
    }

    const reserva = Object.assign({}, rascunho, {
      id: _uid(),
      status: 'aguardando',
      criadoEm: new Date().toISOString(),
    });

    const lista = getReservas();
    lista.unshift(reserva);
    _saveReservas(lista);

    sessionStorage.removeItem(TEMP_KEY);
    sessionStorage.removeItem(SALA_KEY);

    return reserva;
  }

  function cancelReserva(id) {
    const lista = getReservas().filter((r) => r.id !== id);
    return _saveReservas(lista);
  }

  function statusInfo(status) {
    switch (status) {
      case 'aprovada':
        return { label: 'Aprovada', badgeClass: 'badge-green' };
      case 'negado':
        return { label: 'Negado', badgeClass: 'badge-red' };
      case 'aguardando':
      default:
        return { label: 'Aguardando...', badgeClass: 'badge-yellow' };
    }
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return '';
    const partes = isoDate.split('-');
    if (partes.length !== 3) return isoDate;
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }

  function formatHorario(entrada, saida) {
    if (!entrada && !saida) return '';
    return `${entrada || '--:--'} às ${saida || '--:--'}`;
  }

  /**
   * Retorna todas as reservas de uma data específica (formato "YYYY-MM-DD").
   */
  function getReservasPorData(isoDate) {
    return getReservas().filter((r) => r.data === isoDate);
  }

  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  function _pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function toISODate(ano, mesIndex, dia) {
    return `${ano}-${_pad2(mesIndex + 1)}-${_pad2(dia)}`;
  }

  function todayISO() {
    const hoje = new Date();
    return toISODate(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  }

  function mesLabel(ano, mesIndex) {
    return `${MESES[mesIndex]} ${ano}`;
  }

  /**
   * Constrói a matriz de dias de um mês (meses e anos infinitos: qualquer
   * ano/mês, positivo ou negativo, é aceito - o próprio objeto Date do
   * JavaScript normaliza a virada de ano automaticamente).
   *
   * Retorna um array de células: { dia, iso, mesAtual } onde "mesAtual"
   * indica se o dia pertence ao mês exibido (false = dia de
   * preenchimento do mês anterior/seguinte, mostrado "apagado").
   */
  function construirMatrizMes(ano, mesIndex) {
    const primeiroDia = new Date(ano, mesIndex, 1);
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = Domingo
    const diasNoMes = new Date(ano, mesIndex + 1, 0).getDate();
    const diasNoMesAnterior = new Date(ano, mesIndex, 0).getDate();

    const celulas = [];

    // Dias de preenchimento do mês anterior
    for (let i = 0; i < diaSemanaInicio; i++) {
      const dia = diasNoMesAnterior - diaSemanaInicio + 1 + i;
      const dataRef = new Date(ano, mesIndex - 1, dia);
      celulas.push({
        dia,
        iso: toISODate(dataRef.getFullYear(), dataRef.getMonth(), dia),
        mesAtual: false,
      });
    }

    // Dias do mês corrente
    for (let dia = 1; dia <= diasNoMes; dia++) {
      celulas.push({
        dia,
        iso: toISODate(ano, mesIndex, dia),
        mesAtual: true,
      });
    }

    // Dias de preenchimento do mês seguinte (completa a última semana)
    const restante = celulas.length % 7;
    if (restante !== 0) {
      const faltam = 7 - restante;
      for (let dia = 1; dia <= faltam; dia++) {
        const dataRef = new Date(ano, mesIndex + 1, dia);
        celulas.push({
          dia,
          iso: toISODate(dataRef.getFullYear(), dataRef.getMonth(), dia),
          mesAtual: false,
        });
      }
    }

    return celulas;
  }

  return {
    getReservas,
    stageReserva,
    commitStagedReserva,
    cancelReserva,
    statusInfo,
    formatDateBR,
    formatHorario,
    getReservasPorData,
    toISODate,
    todayISO,
    mesLabel,
    construirMatrizMes,
    MESES,
  };
})();
