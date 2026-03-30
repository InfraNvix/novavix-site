{/* SEÇÃO SOLUÇÕES - AGORA COM 6 ITENS EM GRID */}
      <section id="solucoes" className="py-24 bg-slate-50/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">O que entregamos</h2>
            <div className="h-1 w-20 bg-blue-600 mt-2" />
          </div>
          
          {/* Grid configurada para 1 coluna no celular, 2 no tablet e 3 no desktop */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            
            {/* ITEM 1 - Agilidade */}
            <div className="space-y-4">
              <div className="text-blue-600"><Zap size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight uppercase">Agilidade no eSocial</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Envio automático dos eventos de SST para total conformidade.</p>
            </div>

            {/* ITEM 2 - PGR & PCMSO */}
            <div className="space-y-4">
              <div className="text-blue-600"><ShieldCheck size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight uppercase">PGR & PCMSO</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Documentação integrada, atualizada e sempre acessível.</p>
            </div>

            {/* ITEM 3 - Dashboards */}
            <div className="space-y-4">
              <div className="text-blue-600"><BarChart3 size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight uppercase">Gestçao e Controles</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Indicadores estratégicos em tempo real para sua empresa.</p>
            </div>

            {/* NOVO ITEM 4 - Formulários Customizáveis */}
            <div className="space-y-4">
              <div className="text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              </div>
              <h4 className="font-bold text-xl tracking-tight uppercase">Formulários Customizáveis</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Tenha formulários de exames conforme sua necessidade. Não fique preso a padrões pré-estabelecidos!</p>
            </div>

            {/* NOVO ITEM 5 - Faturamento Imediato */}
            <div className="space-y-4">
              <div className="text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h4 className="font-bold text-xl tracking-tight uppercase">Faturamento Imediato</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Todo faturamento plenamente integrado com seu atendimento de forma automática!</p>
            </div>

            {/* NOVO ITEM 6 - Transparência */}
            <div className="space-y-4">
              <div className="text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <h4 className="font-bold text-xl tracking-tight uppercase">Transparência</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Seu cliente pode acompanhar todo o processo em tempo real através de nosso Portal Web dedicado.</p>
            </div>

          </div>
        </div>
      </section>
