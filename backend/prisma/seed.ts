import { PrismaClient, Role, Visibility, BookStatus, BlockType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Elunè database with Admin, Users, Categories, ContentBlocks, and AudioSegments...');

  // 1. Categories
  const categoriesData = [
    { name: 'Philosophy', slug: 'philosophy', description: 'Ancient and modern philosophical inquiries into ethics and mind.' },
    { name: 'Psychology', slug: 'psychology', description: 'Cognitive science, mindfulness, and mental sanctuaries.' },
    { name: 'Self Development', slug: 'self-development', description: 'Actionable frameworks for calm, deep work, and discipline.' },
    { name: 'Technology', slug: 'technology', description: 'AI, computing, and the ethics of digital innovation.' },
    { name: 'Literature', slug: 'literature', description: 'Classic and contemporary literary explorations.' }
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }

  const philosophyCat = await prisma.category.findUnique({ where: { slug: 'philosophy' } });
  const psychologyCat = await prisma.category.findUnique({ where: { slug: 'psychology' } });
  const selfDevCat = await prisma.category.findUnique({ where: { slug: 'self-development' } });

  // 2. Users (Admin + Standard User + Demo User)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);
  const demoPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@elune.read' },
    update: { role: Role.ADMIN },
    create: {
      id: 'usr_admin',
      name: 'Elunè Administrator',
      email: 'admin@elune.read',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@elune.read' },
    update: { role: Role.USER },
    create: {
      id: 'usr_demo_eleanor',
      name: 'Eleanor Vance',
      email: 'demo@elune.read',
      passwordHash: demoPassword,
      role: Role.USER,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  });

  const standardUser = await prisma.user.upsert({
    where: { email: 'user@elune.read' },
    update: { role: Role.USER },
    create: {
      id: 'usr_standard',
      name: 'Marcus Chen',
      email: 'user@elune.read',
      passwordHash: userPassword,
      role: Role.USER,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    }
  });

  console.log(`Created users: Admin (${admin.email}), Demo (${demoUser.email}), User (${standardUser.email})`);

  // 3. Book 1: Meditations (PUBLIC + APPROVED)
  const book1 = await prisma.book.upsert({
    where: { id: 'meditations-aurelius' },
    update: {
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED,
      categoryId: philosophyCat?.id
    },
    create: {
      id: 'meditations-aurelius',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'Personal notes on Stoic philosophy, self-mastery, emotional resilience, and ethical living in an unpredictable world.',
      coverBg: 'linear-gradient(135deg, #4A3E3D 0%, #2A2120 100%)',
      coverTextColor: '#FAF0E6',
      totalPages: 120,
      language: 'en',
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED,
      categoryId: philosophyCat?.id,
      uploadedBy: admin.id
    }
  });

  // Chapter 1 of Meditations
  const ch1 = await prisma.chapter.upsert({
    where: { id: 'ch-med-1' },
    update: {},
    create: {
      id: 'ch-med-1',
      bookId: book1.id,
      chapterNumber: 1,
      title: 'Debts and Lessons from My Elders'
    }
  });

  // Paragraphs / Content Blocks for Chapter 1 with deterministic timing for audio
  const paragraphsCh1 = [
    {
      id: 'cb-med-1-1',
      blockIndex: 1,
      type: BlockType.PARAGRAPH,
      pageNumber: 1,
      text: 'From my grandfather Verus, I learned good morals and the government of my temper. From the reputation and remembrance of my father, modesty and a manly character.',
      startTime: 0.0,
      endTime: 12.5
    },
    {
      id: 'cb-med-1-2',
      blockIndex: 2,
      type: BlockType.PARAGRAPH,
      pageNumber: 1,
      text: 'From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.',
      startTime: 12.5,
      endTime: 26.8
    },
    {
      id: 'cb-med-1-3',
      blockIndex: 3,
      type: BlockType.PARAGRAPH,
      pageNumber: 1,
      text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.',
      startTime: 26.8,
      endTime: 42.0
    },
    {
      id: 'cb-med-1-4',
      blockIndex: 4,
      type: BlockType.PARAGRAPH,
      pageNumber: 2,
      text: 'But I have seen the beauty of good, and the ugliness of evil, and I have recognized that the wrongdoer has a nature related to my own — not of the same blood or birth, but the same mind, and possessing a share of the divine.',
      startTime: 42.0,
      endTime: 58.5
    },
    {
      id: 'cb-med-1-5',
      blockIndex: 5,
      type: BlockType.PARAGRAPH,
      pageNumber: 2,
      text: 'And so none of them can hurt me. No one can implicate me in ugliness. Nor can I be angry at my relative, or hate him. We were born to work together like feet, hands, and the rows of the upper and lower teeth.',
      startTime: 58.5,
      endTime: 74.0
    }
  ];

  for (const p of paragraphsCh1) {
    await prisma.contentBlock.upsert({
      where: { id: p.id },
      update: { text: p.text, pageNumber: p.pageNumber, blockIndex: p.blockIndex },
      create: {
        id: p.id,
        chapterId: ch1.id,
        blockIndex: p.blockIndex,
        type: p.type,
        text: p.text,
        pageNumber: p.pageNumber
      }
    });
  }

  // AudioTrack & AudioSegments for Chapter 1
  const audioTrack1 = await prisma.audioTrack.upsert({
    where: { id: 'at-med-ch1' },
    update: {},
    create: {
      id: 'at-med-ch1',
      bookId: book1.id,
      chapterId: ch1.id,
      audioUrl: '/audio/meditations-ch1.mp3',
      duration: 74.0
    }
  });

  for (const p of paragraphsCh1) {
    await prisma.audioSegment.upsert({
      where: {
        audioTrackId_contentBlockId: {
          audioTrackId: audioTrack1.id,
          contentBlockId: p.id
        }
      },
      update: { startTime: p.startTime, endTime: p.endTime },
      create: {
        audioTrackId: audioTrack1.id,
        contentBlockId: p.id,
        startTime: p.startTime,
        endTime: p.endTime
      }
    });
  }

  // Chapter 2 of Meditations
  const ch2 = await prisma.chapter.upsert({
    where: { id: 'ch-med-2' },
    update: {},
    create: {
      id: 'ch-med-2',
      bookId: book1.id,
      chapterNumber: 2,
      title: 'On the Ruling Mind & Tranquility'
    }
  });

  const paragraphsCh2 = [
    {
      id: 'cb-med-2-1',
      blockIndex: 1,
      type: BlockType.PARAGRAPH,
      pageNumber: 3,
      text: 'Perform every act of your life as if it were your last. Lay aside all carelessness, all passionate aversion to the commands of reason, all hypocrisy, self-love, and dissatisfaction with your own share.',
      startTime: 0.0,
      endTime: 16.0
    },
    {
      id: 'cb-med-2-2',
      blockIndex: 2,
      type: BlockType.PARAGRAPH,
      pageNumber: 3,
      text: 'Remember how long you have put off these things, and how often you have received opportunities from the gods, and yet do not use them. A limit of time is fixed for you; if you do not use it for clearing away the clouds from your mind, it will go and never return.',
      startTime: 16.0,
      endTime: 34.0
    }
  ];

  for (const p of paragraphsCh2) {
    await prisma.contentBlock.upsert({
      where: { id: p.id },
      update: { text: p.text, pageNumber: p.pageNumber },
      create: {
        id: p.id,
        chapterId: ch2.id,
        blockIndex: p.blockIndex,
        type: p.type,
        text: p.text,
        pageNumber: p.pageNumber
      }
    });
  }

  // 4. Book 2: The Architecture of Silence (PUBLIC + APPROVED)
  const book2 = await prisma.book.upsert({
    where: { id: 'architecture-of-silence' },
    update: {
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED,
      categoryId: psychologyCat?.id
    },
    create: {
      id: 'architecture-of-silence',
      title: 'The Architecture of Silence',
      author: 'Evelyn St. Claire',
      description: 'An architectural exploration of quiet spaces, auditory sanctuaries, and how intentional stillness restores creative mental bandwidth in our noisy world.',
      coverBg: 'linear-gradient(135deg, #CDB891 0%, #A6916B 100%)',
      coverTextColor: '#2C2421',
      totalPages: 140,
      language: 'en',
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED,
      categoryId: psychologyCat?.id,
      uploadedBy: admin.id
    }
  });

  const chSilence = await prisma.chapter.upsert({
    where: { id: 'ch-silence-1' },
    update: {},
    create: {
      id: 'ch-silence-1',
      bookId: book2.id,
      chapterNumber: 1,
      title: 'The Overstimulated Mind'
    }
  });

  const paragraphsSilence = [
    {
      id: 'cb-silence-1-1',
      blockIndex: 1,
      type: BlockType.PARAGRAPH,
      pageNumber: 1,
      text: 'Silence is not the absence of sound, but the presence of awareness. In an era dominated by rapid notifications and continuous sensory stimulation, true silence has transformed from a default condition into a deliberate sanctuary.',
      startTime: 0.0,
      endTime: 16.5
    },
    {
      id: 'cb-silence-1-2',
      blockIndex: 2,
      type: BlockType.PARAGRAPH,
      pageNumber: 1,
      text: 'When we create architectural nooks designed for sensory rest, cognitive fatigue dissipates. The human mind requires acoustic proportion just as much as optical clarity.',
      startTime: 16.5,
      endTime: 31.0
    }
  ];

  for (const p of paragraphsSilence) {
    await prisma.contentBlock.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        chapterId: chSilence.id,
        blockIndex: p.blockIndex,
        type: p.type,
        text: p.text,
        pageNumber: p.pageNumber
      }
    });
  }

  // 5. Book 3: PUBLIC + PENDING (For Admin Review testing)
  await prisma.book.upsert({
    where: { id: 'deep-work-focus' },
    update: {},
    create: {
      id: 'deep-work-focus',
      title: 'Deep Work and Peaceful Focus',
      author: 'Kaelen Mori',
      description: 'Submitted by user for public catalog review. Examines cognitive endurance and ritualized concentration.',
      coverBg: 'linear-gradient(135deg, #3A4F41 0%, #1E2B23 100%)',
      coverTextColor: '#E8F0EA',
      totalPages: 160,
      language: 'en',
      visibility: Visibility.PUBLIC,
      status: BookStatus.PENDING,
      categoryId: selfDevCat?.id,
      uploadedBy: standardUser.id,
      chapters: {
        create: [
          {
            title: 'The Value of Deep Solitude',
            chapterNumber: 1,
            contentBlocks: {
              create: [
                {
                  blockIndex: 1,
                  type: BlockType.PARAGRAPH,
                  pageNumber: 1,
                  text: 'Deep solitude allows the nervous system to untangle from superficial urgency. By safeguarding uninterrupted reading stretches, we restore high-order reasoning.'
                }
              ]
            }
          }
        ]
      }
    }
  });

  // 6. Book 4: PRIVATE (Owner only: demoUser)
  const privateBook = await prisma.book.upsert({
    where: { id: 'private-journal-eleanor' },
    update: {},
    create: {
      id: 'private-journal-eleanor',
      title: 'Personal Reflections & Philosophy Journal',
      author: 'Eleanor Vance',
      description: 'My private reading reflections and daily contemplative notes. Visible only to Eleanor.',
      coverBg: 'linear-gradient(135deg, #5C3D2E 0%, #2B1810 100%)',
      coverTextColor: '#FAF0E6',
      totalPages: 45,
      language: 'en',
      visibility: Visibility.PRIVATE,
      status: BookStatus.APPROVED,
      categoryId: philosophyCat?.id,
      uploadedBy: demoUser.id,
      chapters: {
        create: [
          {
            title: 'First Principles of My Sanctuary',
            chapterNumber: 1,
            contentBlocks: {
              create: [
                {
                  blockIndex: 1,
                  type: BlockType.PARAGRAPH,
                  pageNumber: 1,
                  text: 'This private note serves as my personal reading sanctuary within Elunè. Here I synthesize Stoic virtues with modern reflective habits.'
                }
              ]
            }
          }
        ]
      }
    }
  });

  // 7. Seed Bookmarks & Notes per Paragraph for Demo User
  await prisma.bookmark.upsert({
    where: {
      userId_contentBlockId: {
        userId: demoUser.id,
        contentBlockId: 'cb-med-1-3'
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book1.id,
      chapterId: ch1.id,
      contentBlockId: 'cb-med-1-3',
      pageNumber: 1,
      note: 'Crucial morning perspective for peaceful interactions.'
    }
  });

  const existingNote = await prisma.note.findFirst({
    where: { userId: demoUser.id, contentBlockId: 'cb-med-1-3' }
  });
  if (!existingNote) {
    await prisma.note.create({
      data: {
        userId: demoUser.id,
        bookId: book1.id,
        chapterId: ch1.id,
        contentBlockId: 'cb-med-1-3',
        pageNumber: 1,
        content: 'Read this paragraph every morning before opening email or messages.'
      }
    });
  }

  // 8. Seed ReadingProgress with canonical contentBlockId
  await prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: book1.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book1.id,
      currentChapterId: ch1.id,
      currentContentBlockId: 'cb-med-1-3',
      currentPage: 1,
      progressPercentage: 25.0
    }
  });

  // 9. Seed Personal Library (UserBook)
  await prisma.userBook.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: book1.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book1.id,
      isFavorite: true
    }
  });

  await prisma.userBook.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: privateBook.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: privateBook.id,
      isFavorite: false
    }
  });

  console.log('✅ Seeding completed with comprehensive models and data!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
