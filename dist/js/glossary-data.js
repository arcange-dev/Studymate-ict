/* StudyMate ICT — glossary data.
   A curated starter dictionary for beginner ICT / computer systems students.
   Definitions are written in plain language; examples are deliberately concrete. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};

  var TERMS = [
    {
      id: 'cpu', term: 'CPU', full: 'Central Processing Unit', cat: 'Hardware',
      def: 'The main chip that carries out the instructions of a computer program. It fetches instructions, decodes them and executes them, one after another, very quickly.',
      eg: 'When you click a button, the CPU runs the code that reacts to your click.'
    },
    {
      id: 'ram', term: 'RAM', full: 'Random Access Memory', cat: 'Hardware',
      def: 'Fast, temporary working memory that holds the programs and data currently in use. Its contents are lost when the power goes off, which is why it is called volatile memory.',
      eg: 'Opening five browser tabs uses more RAM; closing them releases it.'
    },
    {
      id: 'rom', term: 'ROM', full: 'Read-Only Memory', cat: 'Hardware',
      def: 'Non-volatile memory whose contents are normally read, not changed. It stores the small startup program a computer needs before it can load an operating system.',
      eg: 'The firmware that starts your computer is kept in ROM or flash memory.'
    },
    {
      id: 'motherboard', term: 'Motherboard', full: 'Mainboard / System board', cat: 'Hardware',
      def: 'The main circuit board that connects the CPU, RAM, storage and other components so they can communicate and receive power.',
      eg: 'The CPU is seated in a socket on the motherboard, and RAM modules click into slots on it.'
    },
    {
      id: 'ssd', term: 'SSD', full: 'Solid State Drive', cat: 'Hardware',
      def: 'Storage with no moving parts. It uses flash memory chips, so it starts up faster, is quieter and is more shock-resistant than a hard disk.',
      eg: 'A laptop that boots in ten seconds is probably using an SSD.'
    },
    {
      id: 'hdd', term: 'HDD', full: 'Hard Disk Drive', cat: 'Hardware',
      def: 'Storage that uses spinning magnetic disks and a moving read/write head. It is usually cheaper per gigabyte but slower and more fragile than an SSD.',
      eg: 'External hard drives are often used for large, cheap backups.'
    },
    {
      id: 'os', term: 'Operating System', full: 'OS', cat: 'Software',
      def: 'The system software that manages hardware, files and programs, and gives the user an interface to control the computer.',
      eg: 'Windows, Linux, macOS and Android are operating systems.'
    },
    {
      id: 'firmware', term: 'Firmware', full: '', cat: 'Software',
      def: 'Small, permanent software built into a hardware device that tells it how to operate. It sits between the hardware and the operating system.',
      eg: 'A printer’s firmware controls how it feeds paper and communicates with your computer.'
    },
    {
      id: 'bios', term: 'BIOS', full: 'Basic Input/Output System', cat: 'Software',
      def: 'Older firmware on a PC motherboard that tests the hardware at startup and finds a device to boot from. It has largely been replaced by UEFI.',
      eg: 'Pressing the setup key at startup opens the BIOS settings screen on older machines.'
    },
    {
      id: 'uefi', term: 'UEFI', full: 'Unified Extensible Firmware Interface', cat: 'Software',
      def: 'Modern firmware that replaces BIOS. It supports larger disks, faster booting, a graphical setup screen and secure boot.',
      eg: 'A new PC showing a mouse-driven setup screen at boot is using UEFI.'
    },
    {
      id: 'algorithm', term: 'Algorithm', full: '', cat: 'Programming',
      def: 'A finite, ordered set of steps that solves a problem or completes a task. Every program is an implementation of one or more algorithms.',
      eg: 'A recipe is an everyday algorithm; a sorting routine is a computing one.'
    },
    {
      id: 'programming-language', term: 'Programming language', full: '', cat: 'Programming',
      def: 'A formal language with rules (syntax) and meaning (semantics) used to write instructions a computer can execute, usually after translation by a compiler or interpreter.',
      eg: 'Python, Java, C and JavaScript are programming languages used for different jobs.'
    },
    {
      id: 'input-device', term: 'Input device', full: '', cat: 'Hardware',
      def: 'Any device that sends data or commands into a computer for processing.',
      eg: 'Keyboard, mouse, microphone, scanner and touchscreen are input devices.'
    },
    {
      id: 'output-device', term: 'Output device', full: '', cat: 'Hardware',
      def: 'Any device that presents the result of processing to the user in a form they can perceive.',
      eg: 'Monitor, printer, speaker and projector are output devices.'
    },
    {
      id: 'network', term: 'Network', full: '', cat: 'Networking',
      def: 'Two or more computers connected so they can share data, files and resources such as printers or an internet connection.',
      eg: 'The computers in a school lab connected to one printer form a local network.'
    },
    {
      id: 'cache', term: 'Cache memory', full: 'CPU cache', cat: 'Hardware',
      def: 'A small, very fast memory inside or close to the CPU that keeps recently used instructions and data so the CPU does not have to wait for slower RAM.',
      eg: 'A CPU checks its cache before fetching data from RAM; a cache hit is much faster.'
    },
    {
      id: 'gpu', term: 'GPU', full: 'Graphics Processing Unit', cat: 'Hardware',
      def: 'A processor with many simple cores designed for parallel work such as rendering images, video and, increasingly, machine learning.',
      eg: 'A gaming laptop has a dedicated GPU alongside the CPU.'
    },
    {
      id: 'psu', term: 'PSU', full: 'Power Supply Unit', cat: 'Hardware',
      def: 'The component that converts mains AC power into the regulated DC voltages the computer’s parts need.',
      eg: 'A desktop with a failing PSU may shut down suddenly under heavy load.'
    },
    {
      id: 'bus', term: 'Bus', full: '', cat: 'Hardware',
      def: 'A shared set of pathways that carries data, addresses and control signals between computer components.',
      eg: 'The front-side bus traditionally linked the CPU to main memory.'
    },
    {
      id: 'virtual-memory', term: 'Virtual memory', full: '', cat: 'Software',
      def: 'A technique where the operating system uses part of the storage drive as if it were extra RAM when physical memory runs low. It prevents crashes but is much slower.',
      eg: 'A PC with too little RAM may show heavy disk activity while it swaps to virtual memory.'
    },
    {
      id: 'ip-address', term: 'IP address', full: 'Internet Protocol address', cat: 'Networking',
      def: 'A numeric address that identifies a device on a network so data can be routed to it.',
      eg: '192.168.1.20 is a typical private IPv4 address on a home network.'
    },
    {
      id: 'router', term: 'Router', full: '', cat: 'Networking',
      def: 'A device that forwards data between networks and decides the best path for each packet, often also providing a home or office internet connection.',
      eg: 'Your home router shares one internet connection among phones and laptops.'
    },
    {
      id: 'lan', term: 'LAN', full: 'Local Area Network', cat: 'Networking',
      def: 'A network covering a small area, such as a room, building or campus, usually owned and managed by one organisation.',
      eg: 'A school computer lab connected by one switch is a LAN.'
    },
    {
      id: 'wan', term: 'WAN', full: 'Wide Area Network', cat: 'Networking',
      def: 'A network that spans large distances, connecting LANs across cities or countries. The internet is the largest WAN.',
      eg: 'A company linking its Nairobi and Mombasa offices uses a WAN.'
    },
    {
      id: 'protocol', term: 'Protocol', full: '', cat: 'Networking',
      def: 'An agreed set of rules for how devices exchange data, covering formatting, timing and error handling.',
      eg: 'HTTP governs web requests; TCP ensures packets arrive in order.'
    },
    {
      id: 'compiler', term: 'Compiler', full: '', cat: 'Programming',
      def: 'A program that translates source code into machine code or another lower-level form before the program runs, reporting errors during translation.',
      eg: 'A C program is compiled into an executable file before you run it.'
    },
    {
      id: 'interpreter', term: 'Interpreter', full: '', cat: 'Programming',
      def: 'A program that executes source code one statement at a time, translating as it goes rather than producing a separate executable first.',
      eg: 'Python code is normally run by the Python interpreter.'
    },
    {
      id: 'source-code', term: 'Source code', full: '', cat: 'Programming',
      def: 'Human-readable program instructions written in a programming language, before translation into machine code.',
      eg: 'A file ending in .py or .js contains source code.'
    },
    {
      id: 'cloud-storage', term: 'Cloud storage', full: '', cat: 'Networking',
      def: 'Storing files on a provider’s servers and accessing them over the internet instead of keeping them only on local disks.',
      eg: 'Google Drive and OneDrive keep files available on any signed-in device.'
    },
    {
      id: 'backup', term: 'Backup', full: '', cat: 'Software',
      def: 'A separate copy of data kept so it can be restored after loss, damage or accidental deletion. A backup should be stored somewhere the original is not.',
      eg: 'Copying your project to an external drive and to cloud storage is a 3-2-1 style backup habit.'
    },
    {
      id: 'malware', term: 'Malware', full: 'Malicious software', cat: 'Software',
      def: 'Software written to harm, disrupt or gain unauthorised access to a computer, including viruses, worms, ransomware and spyware.',
      eg: 'Ransomware encrypts files and demands payment; antivirus software tries to detect it.'
    },
    {
      id: 'encryption', term: 'Encryption', full: '', cat: 'Networking',
      def: 'Converting readable data into an unreadable form using a key, so that only someone with the correct key can read it.',
      eg: 'HTTPS encrypts the data between your browser and a website.'
    },
    {
      id: 'database', term: 'Database', full: '', cat: 'Software',
      def: 'An organised collection of data that can be stored, searched and updated efficiently, usually managed by database software.',
      eg: 'A school keeps student records in a database rather than a single spreadsheet.'
    },
    {
      id: 'url', term: 'URL', full: 'Uniform Resource Locator', cat: 'Networking',
      def: 'The address of a resource on the web, showing the protocol, the server and the path to the file or page.',
      eg: 'In https://example.com/notes/ram.html, “https” is the protocol and “/notes/ram.html” is the path.'
    },
    {
      id: 'server', term: 'Server', full: '', cat: 'Networking',
      def: 'A computer or program that provides services or data to other computers (clients) over a network.',
      eg: 'A web server sends pages to browsers; a file server stores shared documents.'
    },
    {
      id: 'binary', term: 'Binary', full: '', cat: 'Hardware',
      def: 'A number system using only two digits, 0 and 1. Computers represent all data as binary because electronic circuits have two reliable states: off and on.',
      eg: 'The decimal number 5 is written 101 in binary.'
    },
    {
      id: 'bit-byte', term: 'Bit and byte', full: '', cat: 'Hardware',
      def: 'A bit is a single binary digit (0 or 1). A byte is eight bits, and is the usual unit for measuring file size and memory.',
      eg: 'One ASCII character such as “A” fits in one byte.'
    },
    {
      id: 'peripheral', term: 'Peripheral', full: '', cat: 'Hardware',
      def: 'Any device connected to a computer to add functionality, such as a keyboard, printer, webcam or external drive.',
      eg: 'A drawing tablet is a peripheral connected over USB.'
    },
    {
      id: 'kernel', term: 'Kernel', full: '', cat: 'Software',
      def: 'The core part of an operating system that directly controls hardware, memory and processes, and mediates access for other software.',
      eg: 'A driver problem can crash the kernel and restart the whole machine.'
    },
    {
      id: 'device-driver', term: 'Device driver', full: '', cat: 'Software',
      def: 'Software that tells the operating system how to communicate with a specific hardware device.',
      eg: 'A new printer often needs its driver installed before it will print.'
    },
    {
      id: 'spreadsheet', term: 'Spreadsheet', full: '', cat: 'Software',
      def: 'Application software that arranges data in rows and columns and can calculate results with formulas.',
      eg: 'A teacher may use a spreadsheet to total marks and calculate averages.'
    }
  ];

  SM.glossaryData = TERMS;
})();
