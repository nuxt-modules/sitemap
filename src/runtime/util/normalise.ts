export function normaliseDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const z = n => (`0${n}`).slice(-2)
  return (
    `${d.getFullYear()
    }-${
    z(d.getMonth() + 1)
    }-${
    z(d.getDate())
    }T${
    z(d.getHours())
    }:${
    z(d.getMinutes())
    }:${
    z(d.getSeconds())
    }+00:00`
  )
}
