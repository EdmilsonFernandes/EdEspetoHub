import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { Code2, Palette, Zap } from "lucide-react";

export function PortfolioPage() {
  const teamMembers = [
    {
      name: "Edmilson Lopes",
      role: "Arquiteto de Software & Desenvolvedor Full Stack Sênior",
      years: 15,
      description: "Atuo há mais de 15 anos no desenvolvimento e arquitetura de sistemas, liderando a criação de soluções digitais escaláveis, seguras e orientadas a negócio. Tenho forte experiência em backend, APIs, bancos de dados e infraestrutura, com atuação prática também em frontend, garantindo uma visão completa do produto de ponta a ponta. Sou movido por desafios que envolvem performance, arquitetura limpa, automação e tomada de decisão técnica, sempre equilibrando tecnologia, custo e experiência do usuário. Já liderei e participei de projetos em ambientes corporativos e startups, incluindo plataformas financeiras, sistemas de engajamento, SaaS e soluções cloud-native.",
      experience: [
        "Node.js & Express",
        "PostgreSQL",
        "Arquitetura de Sistemas",
        "Design de Banco de Dados",
        "Desenvolvimento de APIs"
      ],
      previousWork: "Liderou desenvolvimento backend para múltiplas plataformas de e-commerce e aplicações SaaS",
      avatar: "E",
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Gabriel Botega",
      role: "Desenvolvedor Backend",
      years: 4,
      description: "Especialista em construir sistemas backend confiáveis e otimizar performance. Especializado em design de sistemas e desenvolvimento server-side com foco em eficiência e escalabilidade.",
      experience: [
        "Node.js & Express",
        "Design de Sistemas",
        "Otimização de Banco de Dados",
        "Arquitetura de APIs",
        "Ajuste de Performance"
      ],
      previousWork: "Desenvolveu infraestrutura backend para plataformas fintech e baseadas em assinatura",
      avatar: "G",
      color: "from-purple-500 to-pink-500"
    },
    {
      name: "Juan Felipe Rada",
      role: "Desenvolvedor Frontend",
      years: 4,
      description: "Apaixonado por criar interfaces de usuário belas e eficientes. Forte experiência em frameworks frontend modernos e design responsivo. Focado em entregar experiências de usuário excepcionais.",
      experience: [
        "React & TypeScript",
        "Design Responsivo",
        "Arquitetura de Componentes",
        "Implementação de UI",
        "Otimização de Performance"
      ],
      previousWork: "Construiu aplicações frontend para plataformas de e-commerce e gerenciamento",
      avatar: "J",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <LandingPageLayout>

      {/* Team Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Nosso Time
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Conheça os desenvolvedores talentosos por trás desta plataforma. Reunimos experiências diversas e paixão por criar soluções digitais excepcionais.
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              >
                <div className="p-6 text-center">
                  {/* Avatar */}
                  <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-r ${member.color}`}>
                    {member.avatar}
                  </div>

                  {/* Name and Role */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-red-600 dark:text-red-400 font-semibold">
                      {member.role}
                    </p>
                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-1 rounded-full font-semibold">
                      {member.years}y
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 min-h-12">
                    {member.description}
                  </p>

                  {/* Previous Work */}
                  <div className="bg-slate-100 dark:bg-slate-700 rounded p-3 mb-4">
                    <p className="text-gray-700 dark:text-gray-200 text-xs italic">
                      💼 {member.previousWork}
                    </p>
                  </div>

                  {/* Experience Tags */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {member.experience.map((exp, expIndex) => (
                      <span
                        key={expIndex}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-semibold rounded-full"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Quem Somos
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Somos um time dedicado de desenvolvedores comprometidos em construir soluções inovadoras que capacitam negócios e melhoram a experiência do usuário. Com experiência combinada abrangendo desenvolvimento full-stack, tecnologias frontend modernas e sistemas backend robustos, criamos aplicações que não são apenas funcionais, mas também belas e fáceis de usar.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Nossa abordagem combina excelência técnica com uma compreensão profunda das necessidades do negócio, garantindo que cada projeto que realizamos entregue valor real aos nossos clientes.
              </p>
            </div>

            {/* Info Cards */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border-l-4 border-red-600">
                <div className="flex items-center gap-3 mb-2">
                  <Code2 className="w-6 h-6 text-red-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Stack Tecnológico
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  React, TypeScript, Node.js, Express, PostgreSQL, Docker, AWS
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border-l-4 border-orange-600">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-orange-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Expertise
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Desenvolvimento Full Stack, Arquitetura em Nuvem, Design de Sistemas, Otimização de Banco de Dados
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center gap-3 mb-2">
                  <Palette className="w-6 h-6 text-red-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Nossa Missão
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Construir aplicações escaláveis e de alta performance que resolvem problemas do mundo real
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Nossos Clientes
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Trabalhamos com empresas inovadoras de diversos setores
            </p>
          </div>

          {/* Carousel */}
          <div className="relative overflow-hidden">
            <style>{`
              @keyframes scroll {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(calc(-250px * 5));
                }
              }

              .carousel-scroll {
                animation: scroll 30s linear infinite;
              }

              .carousel-scroll:hover {
                animation-play-state: paused;
              }
            `}</style>

            <div className="carousel-scroll flex gap-8 w-max">
              {[
                "Wibx",
                "Ericsson",
                "Fitec",
                "NtConsult",
                "BirdiRx",
                "Cartola Express",
                "Wibx",
                "Ericsson",
                "Fitec",
                "NtConsult"
              ].map((brand, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-64 h-32 bg-white dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                      {brand}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Cliente
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
