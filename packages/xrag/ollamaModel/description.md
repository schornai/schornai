### Gemma 4 31B

**1. Positionierung & Architektur**
Das _Gemma 4 31B_ ist ein leistungsstarkes, dichtes ("Dense") Modell, das für den lokalen Einsatz auf leistungsstarker Hardware konzipiert ist.

- **Parameter:** Es verfügt über ca. 30,7 Milliarden Parameter.
- **Kontextfenster:** Unterstützt ein sehr großes Fenster von **256K Tokens**, ideal für die Verarbeitung langer Dokumente oder komplexer Zusammenhänge.
- **Multimodalität:** Verarbeitet Text und Bilder (mit variabler Auflösung und Seitenverhältnis) und generiert Textantworten.

**2. Leistungsfähigkeit (Benchmarks)**
Das Modell gehört zur Spitzengruppe ("Frontier-level performance") und übertrifft deutlich kleinere Varianten:

- **Logik & Mathematik (Reasoning):** Erreicht **89,2 %** bei der AIME 2026 (Mathematik-Olympiade) und **85,2 %** im MMLU Pro (breites Allgemeinwissen).
- **Programmierung:** Zeigt eine Codeforces-ELO von **2150**, was es zu einem der besten lokalen Modelle für komplexe Coding-Aufgaben macht.
- **Medizin & Dokumente:** Stark im Bereich medizinischer Fragen (MedXPertQA) und beim Verständnis komplexer Dokumente (OmniDocBench).
- **Vision:** Bewährt bei visuellen Aufgaben wie Bilderkennung und OCR.

**3. Neue Funktionen**

- **Erweitertes Reasoning:** Das Modell ist als hochleistungsfähiger Reasoner designed, der über konfigurierte "Denk-Modi" verfügt, um komplexe Probleme schrittweise zu lösen.
- **System Prompt Support:** Nativer Support für systemseitige Anweisungen, die strukturierte und kontrollierbare Gespräche ermöglichen.
- **Variable Bildauflösung:** Die Qualität der Bildverarbeitung kann je nach Bedarf angepasst werden, um Details zu erhalten oder Inference-Geschwindigkeit zu erhöhen.
