/* eslint-disable no-console */
const fs = require("fs")
const Stream = require("stream")
const { default: turfCentroid } = require("@turf/centroid")
const { polygon: turfPolygon, multiPolygon: turfMultiPolygon } = require("@turf/helpers")
const ngeohash = require("ngeohash")

const berlin = require("./berlin.json")
const shape2geohash = require("../src/index")
const geojsonExamples = require("./geojsonExamples")

const berlinPolygon = berlin.fields.geo_shape

const maps = []

function checkForDuplicates(geohashes) {
  const geohashesAsSet = new Set(geohashes)
  if (geohashes.length !== geohashesAsSet.size) {
    const unique = []
    const duplicates = []
    geohashes.forEach((gh) => {
      if (unique.includes(gh)) {
        duplicates.push(gh)
      } else {
        unique.push(gh)
      }
    })
    return duplicates
  }
  return null
}

function isLine(coordinates) {
  return !Array.isArray(coordinates[0][0])
}

function isMulti(coordinates) {
  return Array.isArray(coordinates[0][0][0])
}

function bboxToCoordinates(bbox) {
  return [
    [
      [bbox[1], bbox[2]],
      [bbox[3], bbox[2]],
      [bbox[3], bbox[0]],
      [bbox[1], bbox[0]],
      [bbox[1], bbox[2]],
    ],
  ]
}

function visualizeTestCase(coordinates, geohashes, description) {
  let shape
  if (isLine(coordinates)) {
    const reverseLine = coordinates.slice(0, coordinates.length - 1).reverse()
    coordinates.push(...reverseLine)
    shape = turfPolygon([coordinates])
  } else {
    if (isMulti(coordinates)) {
      shape = turfMultiPolygon(coordinates)
    } else {
      shape = turfPolygon(coordinates)
    }
  }
  const centroid = turfCentroid(shape).geometry.coordinates
  maps.push({
    shape: shape.geometry,
    geohashes,
    centroid,
    description,
  })
}

describe("Berlin tests", () => {
  test("intersect", async () => {
    const geohashes = await shape2geohash(berlinPolygon)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase([berlinPolygon.coordinates], geohashes, "Berlin insersect")
  })

  test("envelope", async () => {
    const geohashes = await shape2geohash(berlinPolygon, {
      hashMode: "envelope",
    })
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase([berlinPolygon.coordinates], geohashes, "Berlin envelope")
  })

  test("insideOnly", async () => {
    const expectedGeohashes = [
      "u337n",
      "u337p",
      "u33e0",
      "u33e1",
      "u33e4",
      "u336u",
      "u336v",
      "u336y",
      "u336z",
      "u33db",
      "u33dc",
      "u33df",
      "u33dg",
      "u33du",
      "u336s",
      "u336t",
      "u336w",
      "u336x",
      "u33d8",
      "u33d9",
      "u33dd",
      "u33de",
      "u33ds",
      "u3367",
      "u336k",
      "u336m",
      "u336q",
      "u336r",
      "u33d2",
      "u33d3",
      "u33d6",
      "u33d7",
      "u33dk",
      "u33dn",
    ]
    const geohashes = await shape2geohash(berlinPolygon, {
      hashMode: "insideOnly",
      precision: 5,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase([berlinPolygon.coordinates], geohashes, "Berlin insideOnly")
  })

  test("border", async () => {
    const geohashes = await shape2geohash(berlinPolygon, {
      hashMode: "border",
    })
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase([berlinPolygon.coordinates], geohashes, "Berlin border")
  })
})

describe("Manual tests", () => {
  test("Test exact geohash", async () => {
    const testGeohash = "u336x"
    const bbox = ngeohash.decode_bbox(testGeohash)
    const geohashes = await shape2geohash(bboxToCoordinates(bbox), {
      precision: testGeohash.length,
    })
    expect(geohashes.length).toBe(1)
    expect(geohashes[0]).toBe(testGeohash)
    visualizeTestCase(bboxToCoordinates(bbox), geohashes, "Test exact geohash")
  })

  test("Test polygon", async () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ]
    const expectedGeohashes = ["u336x", "u33d8", "u33d9", "u336r", "u33d2", "u33d3"]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test polygon")
  })

  test("Test multi polygon", async () => {
    const polygon = [
      [13.331187, 52.49439],
      [13.371699, 52.509027],
      [13.4245712, 52.50401228],
      [13.41221166, 52.457175],
      [13.3414871, 52.4504801],
      [13.331187, 52.49439],
    ]

    const polygon2 = polygon.map(([long, lat]) => {
      return [long + 0.26, lat]
    })

    const multiPolygon = [[polygon], [polygon2]]
    const expectedGeohashes = [
      "u336x",
      "u33d8",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
      "u33dt",
      "u33dw",
      "u33dx",
      "u33dm",
      "u33dq",
      "u33dr",
    ]
    const geohashes = await shape2geohash(multiPolygon, {
      precision: expectedGeohashes[0].length,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(multiPolygon, geohashes, "Test multi polygon")
  })

  test("Test polygon with a hole", async () => {
    const polygon = [
      [
        [13.328475952148438, 52.54713081557263],
        [13.330535888671875, 52.4350833510599],
        [13.423233032226562, 52.44178076592579],
        [13.410873413085938, 52.55172368081563],
        [13.328475952148438, 52.54713081557263],
      ],
      [
        [13.336029052734373, 52.5433726592131],
        [13.338775634765625, 52.441362207320445],
        [13.41499328613281, 52.44596613327885],
        [13.40606689453125, 52.54838346285351],
        [13.336029052734373, 52.5433726592131],
      ],
    ]

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test polygon with a hole")
  })

  test("Test polygon with hashMode 'border'", async () => {
    const polygon = [
      [
        [13.328475952148438, 52.54713081557263],
        [13.330535888671875, 52.4350833510599],
        [13.423233032226562, 52.44178076592579],
        [13.410873413085938, 52.55172368081563],
        [13.328475952148438, 52.54713081557263],
      ],
    ]

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
      hashMode: "border",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test polygon with hashMode 'border'")
  })

  test("Test polygon with hashMode 'insideOnly'", async () => {
    const polygon = [
      [
        [13.328819274902344, 52.510579539510864],
        [13.327960968017578, 52.43351349719224],
        [13.422374725341797, 52.4388507721828],
        [13.41482162475586, 52.549427308276925],
        [13.327789306640625, 52.5481746907895],
        [13.328819274902344, 52.510579539510864],
      ],
    ]

    const expectedGeohashes = ["u33d8"]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
      hashMode: "insideOnly",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test polygon with hashMode 'insideOnly'")
  })

  test("Test polygon with hashMode 'envelope'", async () => {
    const polygon = [
      [
        [13.33740234375, 52.453498792506736],
        [13.407440185546875, 52.45308034523523],
        [13.402633666992188, 52.53919655252312],
        [13.33740234375, 52.453498792506736],
      ],
    ]

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d8",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
      hashMode: "envelope",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test polygon with hashMode 'envelope'")
  })

  test("Test line with hashMode 'intersect'", async () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ]

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"]

    const geohashes = await shape2geohash(line, {
      precision: expectedGeohashes[0].length,
      hashMode: "intersect",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(line, geohashes, "Test line with hashMode 'intersect'")
  })

  test("Test line with hashMode 'border'", async () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ]

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"]

    const geohashes = await shape2geohash(line, {
      precision: expectedGeohashes[0].length,
      hashMode: "border",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(line, geohashes, "Test line with hashMode 'border'")
  })

  test("Test line with hashMode 'insideOnly'", async () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ]

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"]

    const geohashes = await shape2geohash(line, {
      precision: expectedGeohashes[0].length,
      hashMode: "insideOnly",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(line, geohashes, "Test line with hashMode 'insideOnly'")
  })

  test("Test line with hashMode 'envelope'", async () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ]

    const expectedGeohashes = [
      "u336w",
      "u336x",
      "u33d8",
      "u33d9",
      "u33dd",
      "u336q",
      "u336r",
      "u33d2",
      "u33d3",
      "u33d6",
    ]

    const geohashes = await shape2geohash(line, {
      precision: expectedGeohashes[0].length,
      hashMode: "envelope",
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(line, geohashes, "Test line with hashMode 'envelope'")
  })

  test("Test minIntersect 0.5", async () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ]
    const expectedGeohashes = [
      // "u336x",
      "u33d8",
      // "u33d9",
      // "u336r",
      // "u33d2",
      // "u33d3",
    ]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
      minIntersect: 0.5,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test minIntersect 0.5")
  })

  test("Test minIntersect 0.25", async () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ]
    const expectedGeohashes = [
      "u336x",
      "u33d8",
      "u33d9",
      // "u336r",
      "u33d2",
      // "u33d3",
    ]
    const geohashes = await shape2geohash(polygon, {
      precision: expectedGeohashes[0].length,
      minIntersect: 0.25,
    })
    geohashes.forEach((gh) => {
      expect(expectedGeohashes).toContain(gh)
    })
    expect(geohashes.length).toBe(expectedGeohashes.length)
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
    visualizeTestCase(polygon, geohashes, "Test minIntersect 0.25")
  })

  test("Test custom writer", async () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ]

    const expectedGeohashes = [
      ["u336x", "u33d8", "u33d9"],
      ["u336r", "u33d2", "u33d3"],
    ]

    let i = 0
    const myCustomWriter = new Stream.Writable({
      objectMode: true, // THIS IS IMPORTANT
      write: (rowGeohashes, enc, callback) => {
        rowGeohashes.forEach((gh) => {
          expect(expectedGeohashes[i]).toContain(gh)
        })
        expect(rowGeohashes.length).toBe(expectedGeohashes[i].length)

        const duplicates = checkForDuplicates(rowGeohashes)
        expect(duplicates).toBe(null)
        i++

        callback()
      },
    })

    await shape2geohash(polygon, {
      customWriter: myCustomWriter,
      precision: expectedGeohashes[0][0].length,
      // ...other options
    })
  })

  test("Test custom writer with Point", async () => {
    let writerWasCalled = false
    const myCustomWriter = new Stream.Writable({
      objectMode: true, // THIS IS IMPORTANT
      write: (rowGeohashes, enc, callback) => {
        writerWasCalled = true
        expect(rowGeohashes.length).toBe(1)
        expect(rowGeohashes[0]).toBe("u336xp")
        callback()
      },
    })

    await shape2geohash(geojsonExamples.Point(), {
      customWriter: myCustomWriter,
      // ...other options
    })

    expect(writerWasCalled).toBe(true)
  })

  test("Overlapping polygons -> Allow duplicates", async () => {
    const geohashes = await shape2geohash(geojsonExamples.overlappingPolygons())
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).not.toBe(null)
    expect(duplicates.length).not.toBe(0)
  })

  test("Overlapping polygons -> Don't allow duplicates", async () => {
    const geohashes = await shape2geohash(geojsonExamples.overlappingPolygons(), {
      allowDuplicates: false,
    })
    const duplicates = checkForDuplicates(geohashes)
    expect(duplicates).toBe(null)
  })

  test("Test point", async () => {
    const testGeohash = "u336xps"
    const geohashes = await shape2geohash(geojsonExamples.Point(), {
      precision: testGeohash.length,
    })
    expect(geohashes.length).toBe(1)
    expect(geohashes[0]).toBe(testGeohash)
  })

  test("Test multi point", async () => {
    const testGeohashes = ["u336xps", "u336xnw"]
    const geohashes = await shape2geohash(geojsonExamples.MultiPoint(), {
      precision: testGeohashes[0].length,
    })
    expect(geohashes.length).toBe(2)
    expect(geohashes[0]).toBe(testGeohashes[0])
    expect(geohashes[1]).toBe(testGeohashes[1])
  })

  test("Test very small line", async () => {
    // From Github Issue #2
    const testGeohashes = ["ez3cys"]
    const geohashes = await shape2geohash({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-8.49468397061034, 41.1146472476304],
          [-8.49468566805409, 41.1146850333377],
        ],
      },
    })
    expect(geohashes.length).toBe(1)
    expect(geohashes[0]).toBe(testGeohashes[0])
  })
})

afterAll(() => {
  const dataString = `const maps = ${JSON.stringify(maps, null, 2)}`

  fs.writeFileSync("./test/visualization/data.js", dataString)
})
