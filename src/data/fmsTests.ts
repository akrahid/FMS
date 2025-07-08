import { FMSTest } from '../types/assessment';

export const FMS_TESTS: FMSTest[] = [
  {
    id: 'deep-squat',
    name: 'Deep Squat',
    description: 'Assesses bilateral, symmetrical, and functional mobility of the hips, knees, and ankles. The deep squat is used to assess bilateral, symmetrical, functional mobility of the hips, knees and ankles.',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hold dowel overhead with arms extended',
      'Descend into deepest squat position possible',
      'Keep dowel aligned over feet',
      'Hold position for 2 seconds',
      'Return to starting position'
    ],
    keyPoints: [
      'Torso parallel to tibia or toward vertical',
      'Femur below horizontal',
      'Knees aligned over feet',
      'Dowel aligned over feet',
      'Heels remain on ground',
      'No compensation patterns'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Upper torso parallel to tibia or toward vertical',
          'Femur below horizontal',
          'Knees aligned over feet',
          'Dowel aligned over feet'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Upper torso parallel to tibia or toward vertical',
          'Femur below horizontal',
          'Knees aligned over feet',
          'Dowel not aligned over feet'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Tibia and upper torso not parallel',
          'Femur not below horizontal',
          'Knees not aligned over feet',
          'Dowel not aligned over feet'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'knee-valgus-left',
        name: 'Knee Valgus Angle (L)',
        description: 'Left knee inward deviation from neutral alignment',
        targetDescription: '≤ 15°',
        targetMax: 15,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'knee-valgus-right',
        name: 'Knee Valgus Angle (R)',
        description: 'Right knee inward deviation from neutral alignment',
        targetDescription: '≤ 15°',
        targetMax: 15,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'knee-flexion-depth',
        name: 'Knee Flexion Depth',
        description: 'Maximum knee flexion achieved during squat',
        targetDescription: 'Hips below knees',
        targetMin: 120,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 120,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'hurdle-step',
    name: 'Hurdle Step',
    description: 'Assesses bilateral functional mobility and stability of the hips, knees, and ankles. The hurdle step challenges the body\'s step and stride mechanics.',
    instructions: [
      'Stand behind hurdle set at tibial tuberosity height',
      'Hold dowel across shoulders',
      'Step over hurdle with one leg',
      'Touch heel to floor',
      'Return to starting position',
      'Repeat with other leg'
    ],
    keyPoints: [
      'Minimal movement of dowel',
      'Hips, knees, and ankles stay aligned',
      'Heel touches floor',
      'No loss of balance',
      'Stance leg remains stable',
      'No compensation patterns'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Hips, knees, and ankles remain aligned',
          'Minimal movement of dowel',
          'No loss of balance'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Alignment maintained',
          'Movement of dowel',
          'No loss of balance'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Loss of alignment',
          'Loss of balance',
          'Movement of dowel'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'pelvic-rotation',
        name: 'Pelvic Rotation',
        description: 'Rotation of pelvis during movement',
        targetDescription: '≤ 10°',
        targetMax: 10,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 10,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'front-knee-flexion',
        name: 'Front Knee Flexion',
        description: 'Knee flexion of stepping leg',
        targetDescription: '≥ 90°',
        targetMin: 90,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 90,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'inline-lunge',
    name: 'In-line Lunge',
    description: 'Assesses hip mobility and stability, quadriceps flexibility, and knee stability. The in-line lunge attempts to place the body in a position that will focus on the stresses as simulated during rotational, decelerating and lateral-type movements.',
    instructions: [
      'Stand with feet on line, separated by tibia length',
      'Hold dowel behind back maintaining three points of contact',
      'Descend into lunge position',
      'Knee touches line behind front foot',
      'Return to starting position',
      'Repeat on other side'
    ],
    keyPoints: [
      'Dowel maintains contact with head, thoracic spine, and sacrum',
      'Dowel remains vertical',
      'No torso movement',
      'Knee touches line',
      'No loss of balance',
      'Feet remain on line'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Dowel maintains contact',
          'Dowel remains vertical',
          'No torso movement',
          'Knee touches line'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Dowel maintains contact',
          'Dowel remains vertical',
          'Torso movement',
          'Knee touches line'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Loss of dowel contact',
          'Loss of balance',
          'Knee does not touch line'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'pelvic-tilt',
        name: 'Pelvic Tilt',
        description: 'Anterior/posterior pelvic tilt',
        targetDescription: '≤ 5°',
        targetMax: 5,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 5,
          tolerance: 2,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'trail-leg-hip-flexion',
        name: 'Trail Leg Hip Flexion',
        description: 'Hip flexion of rear leg',
        targetDescription: '≥ 15°',
        targetMin: 15,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'active-straight-leg-raise',
    name: 'Active Straight-leg Raise',
    description: 'Assesses active hamstring and gastroc-soleus flexibility while maintaining a stable pelvis and active extension of the opposite leg. The active straight-leg raise tests the ability to disassociate the lower extremities while maintaining stability in the torso.',
    instructions: [
      'Lie supine with arms at sides',
      'Place dowel under lower back at lumbar spine',
      'Actively raise one leg with knee straight',
      'Opposite leg remains flat on ground',
      'Raise leg as high as possible',
      'Lower leg slowly and repeat other side'
    ],
    keyPoints: [
      'Knee remains straight during lift',
      'Opposite leg stays flat on ground',
      'No hip hiking or rotation',
      'Dowel maintains contact with back',
      'Smooth controlled movement',
      'No compensation patterns'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Malleolus passes vertical line from mid-patella',
          'Opposite leg remains flat',
          'No movement at lumbar spine'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Malleolus passes vertical line from ASIS',
          'Opposite leg remains flat',
          'No movement at lumbar spine'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Malleolus does not reach ASIS line',
          'OR opposite leg moves',
          'OR movement at lumbar spine'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'hip-flexion-angle',
        name: 'Hip Flexion Angle',
        description: 'Maximum hip flexion achieved',
        targetDescription: '≥ 70°',
        targetMin: 70,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 70,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'pelvic-stability',
        name: 'Pelvic Stability',
        description: 'Pelvic tilt during movement',
        targetDescription: '≤ 5°',
        targetMax: 5,
        unit: '°',
        isCritical: true,
        category: 'stability',
        validationCriteria: {
          passThreshold: 5,
          tolerance: 2,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'trunk-stability-pushup',
    name: 'Trunk Stability Push-up',
    description: 'Assesses the ability to stabilize the spine in an anterior-posterior plane during a closed-chain upper body movement. The trunk stability push-up tests the ability to stabilize the spine in a sagittal plane during a closed-chain upper extremity movement.',
    instructions: [
      'Lie prone with feet together',
      'Men: hands at forehead level, Women: hands at chin level',
      'Lift body as one unit into push-up position',
      'Perform one push-up',
      'Lower body as one unit',
      'If unable, move hands to easier position and retry'
    ],
    keyPoints: [
      'Body lifts as one unit',
      'No lag in lumbar spine',
      'No knee touching ground',
      'Full push-up completed',
      'Body lowers as one unit',
      'No compensation patterns'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Men: 1 repetition from forehead position',
          'Women: 1 repetition from chin position',
          'Body lifts as one unit'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Men: 1 repetition from chin position',
          'Women: 1 repetition from clavicle position',
          'Body lifts as one unit'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Unable to perform 1 repetition',
          'OR body does not lift as one unit',
          'OR knees touch ground'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'trunk-stability',
        name: 'Trunk Stability',
        description: 'Spine alignment during movement',
        targetDescription: '≤ 5° deviation',
        targetMax: 5,
        unit: '°',
        isCritical: true,
        category: 'stability',
        validationCriteria: {
          passThreshold: 5,
          tolerance: 2,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'body-alignment',
        name: 'Body Alignment',
        description: 'Straight line from head to heels',
        targetDescription: '≤ 3° deviation',
        targetMax: 3,
        unit: '°',
        isCritical: true,
        category: 'alignment',
        validationCriteria: {
          passThreshold: 3,
          tolerance: 1,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'rotary-stability',
    name: 'Rotary Stability',
    description: 'Assesses multi-planar pelvic, core, and shoulder girdle stability during a combined upper and lower extremity motion. The rotary stability test is a complex movement requiring proper neuromuscular coordination and energy transfer through the torso.',
    instructions: [
      'Start in quadruped position with dowel on back',
      'Hands under shoulders, knees under hips',
      'Simultaneously extend opposite arm and leg',
      'Touch hand to knee under body',
      'Return to starting position',
      'Repeat on other side'
    ],
    keyPoints: [
      'Dowel maintains contact with back',
      'No rotation of spine',
      'Smooth coordinated movement',
      'Hand touches knee',
      'Return to start position',
      'No loss of balance'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Performs correctly with opposite arm/leg',
          'Dowel maintains contact',
          'No loss of balance'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Performs correctly with same side arm/leg',
          'Dowel maintains contact',
          'No loss of balance'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Unable to perform with same side',
          'OR loss of dowel contact',
          'OR loss of balance'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'spinal-rotation',
        name: 'Spinal Rotation',
        description: 'Rotation of spine during movement',
        targetDescription: '≤ 5°',
        targetMax: 5,
        unit: '°',
        isCritical: true,
        category: 'stability',
        validationCriteria: {
          passThreshold: 5,
          tolerance: 2,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'coordination-timing',
        name: 'Coordination & Timing',
        description: 'Synchronization of arm and leg movement',
        targetDescription: '≤ 100ms difference',
        targetMax: 100,
        unit: 'ms',
        isCritical: false,
        category: 'stability',
        validationCriteria: {
          passThreshold: 100,
          tolerance: 25,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  },
  {
    id: 'shoulder-mobility',
    name: 'Shoulder Mobility',
    description: 'Assesses bilateral shoulder range of motion, combining internal rotation with adduction and external rotation with abduction. The shoulder mobility screen assesses bilateral shoulder range of motion, combining internal rotation with adduction and external rotation with abduction.',
    instructions: [
      'Stand with feet together',
      'Make fists with thumbs inside',
      'Place one hand behind back from below',
      'Place other hand behind back from above',
      'Attempt to touch fists together',
      'Measure distance between fists',
      'Repeat with opposite hand positions'
    ],
    keyPoints: [
      'Fists remain closed with thumbs inside',
      'No arching of back',
      'No shifting of hands after placement',
      'Measure closest point between fists',
      'Test both sides',
      'No compensation patterns'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Perfect',
        criteria: [
          'Fists touch or overlap',
          'No compensation',
          'Both sides equal'
        ]
      },
      {
        score: 2,
        description: 'Good',
        criteria: [
          'Fists within 1.5 hand lengths',
          'No compensation',
          'Both sides within 1.5 hand lengths'
        ]
      },
      {
        score: 1,
        description: 'Poor',
        criteria: [
          'Fists greater than 1.5 hand lengths apart',
          'OR compensation present',
          'OR asymmetry between sides'
        ]
      },
      {
        score: 0,
        description: 'Pain',
        criteria: ['Pain during movement']
      }
    ],
    metrics: [
      {
        id: 'shoulder-internal-rotation',
        name: 'Shoulder Internal Rotation',
        description: 'Internal rotation range of motion',
        targetDescription: '≥ 70°',
        targetMin: 70,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 70,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'shoulder-external-rotation',
        name: 'Shoulder External Rotation',
        description: 'External rotation range of motion',
        targetDescription: '≥ 90°',
        targetMin: 90,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 90,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'bilateral-symmetry',
        name: 'Bilateral Symmetry',
        description: 'Difference between left and right sides',
        targetDescription: '≤ 10° difference',
        targetMax: 10,
        unit: '°',
        isCritical: false,
        category: 'symmetry',
        validationCriteria: {
          passThreshold: 10,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  }
  ,
  {
    id: 'drop-jump',
    name: 'Drop Jump Test',
    description: 'Assesses dynamic knee stability and ACL injury risk during landing. The drop jump test evaluates neuromuscular control, landing mechanics, and bilateral symmetry during a standardized plyometric movement.',
    instructions: [
      'Set up 31cm box with dual cameras positioned at 45° angles',
      'Stand on box with feet shoulder-width apart',
      'Position arms at shoulder abduction 45°, elbow flexion 90°',
      'Drop off box (do not jump up)',
      'Land on both feet simultaneously',
      'Immediately perform maximum vertical jump',
      'Complete 3 practice trials, then 9 scored trials',
      'Rest 10 seconds between trials'
    ],
    keyPoints: [
      'Knee alignment - patella should track over first toe',
      'Bilateral symmetry - equal weight distribution',
      'Trunk control - minimal forward/lateral lean',
      'Arm position - maintain 45° shoulder abduction',
      'Landing technique - forefoot to heel contact',
      'No knee valgus collapse during landing phase',
      'Quick transition to vertical jump',
      'Consistent landing pattern across trials'
    ],
    scoringCriteria: [
      {
        score: 3,
        description: 'Low Risk',
        criteria: [
          'Knee valgus ≤10° on all trials',
          'Bilateral symmetry maintained',
          'Trunk lean ≤10° in all planes',
          'Proper arm position maintained',
          'No compensatory movements'
        ]
      },
      {
        score: 2,
        description: 'Moderate Risk',
        criteria: [
          'Knee valgus 11-15° on some trials',
          'Mild bilateral asymmetry',
          'Trunk lean 11-15°',
          'Occasional arm position errors',
          'Minor compensatory patterns'
        ]
      },
      {
        score: 1,
        description: 'High Risk',
        criteria: [
          'Knee valgus >15° on multiple trials',
          'Significant bilateral asymmetry',
          'Trunk lean >15°',
          'Poor arm position control',
          'Multiple compensatory movements'
        ]
      },
      {
        score: 0,
        description: 'Unable/Pain',
        criteria: ['Pain during movement', 'Unable to complete test safely']
      }
    ],
    metrics: [
      {
        id: 'knee-valgus-3d-left',
        name: 'Knee Valgus 3D (L)',
        description: '3D knee valgus angle during landing phase',
        targetDescription: '≤ 15°',
        targetMax: 15,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'knee-valgus-3d-right',
        name: 'Knee Valgus 3D (R)',
        description: '3D knee valgus angle during landing phase',
        targetDescription: '≤ 15°',
        targetMax: 15,
        unit: '°',
        isCritical: true,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'trunk-lean-sagittal',
        name: 'Trunk Lean (Sagittal)',
        description: 'Forward/backward trunk lean during landing',
        targetDescription: '≤ 15°',
        targetMax: 15,
        unit: '°',
        isCritical: false,
        category: 'angle',
        validationCriteria: {
          passThreshold: 15,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'trunk-lean-frontal',
        name: 'Trunk Lean (Frontal)',
        description: 'Left/right trunk lean during landing',
        targetDescription: '≤ 10°',
        targetMax: 10,
        unit: '°',
        isCritical: false,
        category: 'angle',
        validationCriteria: {
          passThreshold: 10,
          tolerance: 3,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'bilateral-symmetry',
        name: 'Bilateral Symmetry',
        description: 'Left-right movement symmetry index',
        targetDescription: '≤ 10% difference',
        targetMax: 10,
        unit: '%',
        isCritical: true,
        category: 'symmetry',
        validationCriteria: {
          passThreshold: 10,
          tolerance: 5,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'landing-stability',
        name: 'Landing Stability',
        description: 'Center of mass control during landing',
        targetDescription: '≤ 50mm displacement',
        targetMax: 50,
        unit: 'mm',
        isCritical: false,
        category: 'stability',
        validationCriteria: {
          passThreshold: 50,
          tolerance: 15,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      },
      {
        id: 'arm-position-compliance',
        name: 'Arm Position Compliance',
        description: 'Maintenance of proper arm position',
        targetDescription: '45° ± 10°',
        targetMin: 35,
        targetMax: 55,
        unit: '°',
        isCritical: false,
        category: 'alignment',
        validationCriteria: {
          passThreshold: 45,
          tolerance: 10,
          colorCoding: {
            pass: '#10B981',
            warning: '#F59E0B',
            fail: '#EF4444'
          }
        }
      }
    ]
  }
];